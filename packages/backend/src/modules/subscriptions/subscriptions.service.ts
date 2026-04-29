import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  PaymentProcessor,
  SubscriptionStatus,
  SubscriptionType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';

// Grace period duration in days after a failed payment
const GRACE_PERIOD_DAYS = 3;

// Platform fee percentage (10%)
const PLATFORM_FEE_PERCENT = 0.1;

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
  ) {}

  // ─── Free Subscriptions ────────────────────────────────────────────────────

  /**
   * Create a free subscription for a subscriber to a publication.
   * Throws ConflictException if an active or grace-period subscription already exists.
   */
  async subscribeFree(subscriberId: string, publicationIdOrSlug: string) {
    // Support both UUID and slug lookup
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(publicationIdOrSlug);
    const publication = await this.prisma.publication.findUnique({
      where: isUuid ? { id: publicationIdOrSlug } : { slug: publicationIdOrSlug },
    });

    if (!publication) {
      throw new NotFoundException(`Publication "${publicationIdOrSlug}" not found`);
    }

    const pubId = publication.id;

    // Check for existing active or grace_period subscription (any type)
    const existing = await this.prisma.subscription.findFirst({
      where: {
        subscriber_id: subscriberId,
        publication_id: pubId,
        status: { in: [SubscriptionStatus.active, SubscriptionStatus.grace_period] },
      },
    });

    if (existing) {
      throw new ConflictException(
        'You already have an active subscription to this publication',
      );
    }

    return this.prisma.subscription.create({
      data: {
        subscriber_id: subscriberId,
        publication_id: pubId,
        type: SubscriptionType.free,
        status: SubscriptionStatus.active,
      },
      include: { publication: true },
    });
  }

  // ─── Paid Subscriptions ────────────────────────────────────────────────────

  /**
   * Initiate a paid subscription flow.
   * Creates a pending subscription record and returns a payment URL from the
   * chosen processor. The subscription is activated via handlePaymentSuccess()
   * once the webhook confirms the charge.
   */
  async subscribePaid(
    subscriberId: string,
    publicationIdOrSlug: string,
    processor: PaymentProcessor,
  ): Promise<{ paymentUrl: string }> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(publicationIdOrSlug);
    const publication = await this.prisma.publication.findUnique({
      where: isUuid ? { id: publicationIdOrSlug } : { slug: publicationIdOrSlug },
    });

    if (!publication) {
      throw new NotFoundException(`Publication "${publicationIdOrSlug}" not found`);
    }

    const pubId = publication.id;

    if (!publication.paid_enabled) {
      throw new ConflictException(
        'This publication does not have paid subscriptions enabled',
      );
    }

    // Check for existing active or grace_period paid subscription
    const existing = await this.prisma.subscription.findFirst({
      where: {
        subscriber_id: subscriberId,
        publication_id: pubId,
        status: { in: [SubscriptionStatus.active, SubscriptionStatus.grace_period] },
        type: SubscriptionType.paid,
      },
    });

    if (existing) {
      throw new ConflictException(
        'You already have an active paid subscription to this publication',
      );
    }

    // Create a pending subscription record that will be activated on payment success
    const subscription = await this.prisma.subscription.create({
      data: {
        subscriber_id: subscriberId,
        publication_id: pubId,
        type: SubscriptionType.paid,
        status: SubscriptionStatus.pending,
      },
    });

    // Amount is in kopecks (integer), taken from the publication config
    const amountKopecks = publication.paid_price_monthly;

    let paymentUrl: string;

    switch (processor) {
      case PaymentProcessor.cloudpayments:
        paymentUrl = await this.paymentsService.createCloudPaymentsSession(
          amountKopecks,
          subscriberId,
          publication.name,
        );
        break;
      case PaymentProcessor.yookassa:
        paymentUrl = await this.paymentsService.createYooKassaPayment(
          amountKopecks,
          subscriberId,
          publication.name,
        );
        break;
      case PaymentProcessor.sbp:
        paymentUrl = await this.paymentsService.createSbpPayment(
          amountKopecks,
          subscriberId,
          publication.name,
        );
        break;
      default:
        throw new ConflictException(`Unsupported payment processor: ${processor as string}`);
    }

    this.logger.log(
      `Pending subscription ${subscription.id} created for user ${subscriberId} via ${processor}`,
    );

    return { paymentUrl };
  }

  // ─── Cancellation ─────────────────────────────────────────────────────────

  /**
   * Cancel a subscription.
   * Only the subscriber who owns the subscription may cancel it.
   * Access is retained until expires_at (period end) — the subscription
   * transitions to "cancelled" status, not immediately to "expired".
   */
  async cancelSubscription(subscriptionId: string, userId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription "${subscriptionId}" not found`);
    }

    if (subscription.subscriber_id !== userId) {
      throw new ForbiddenException(
        'You do not have permission to cancel this subscription',
      );
    }

    if (subscription.status === SubscriptionStatus.cancelled) {
      throw new ConflictException('Subscription is already cancelled');
    }

    if (subscription.status === SubscriptionStatus.expired) {
      throw new ConflictException('Subscription has already expired');
    }

    return this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: SubscriptionStatus.cancelled,
        cancelled_at: new Date(),
      },
    });
  }

  // ─── Payment Webhooks ──────────────────────────────────────────────────────

  /**
   * Activate a subscription after a successful payment.
   *
   * Steps:
   * 1. Find the matching pending Payment or subscription by processor_tx_id.
   * 2. Calculate platform fee (10%), processor fee, and author payout.
   * 3. Create (or update) the Payment record.
   * 4. Set subscription to active, set expires_at to 30 days from now.
   * 5. Notify the publication author (logged here; real email via EmailService).
   */
  async handlePaymentSuccess(
    processorTxId: string,
    processor: PaymentProcessor,
    amountKopecks: number,
  ) {
    this.logger.log(
      `Payment success: txId=${processorTxId} processor=${processor} amount=${amountKopecks}`,
    );

    // Find an existing Payment record with this tx id
    let payment = await this.prisma.payment.findFirst({
      where: { processor_tx_id: processorTxId },
      include: { subscription: true },
    });

    // If no payment found yet, locate the most recent pending paid subscription
    // (this covers the flow where the webhook fires before a Payment row is created)
    let subscriptionId: string;

    if (payment) {
      subscriptionId = payment.subscription_id;
    } else {
      const pendingSub = await this.prisma.subscription.findFirst({
        where: {
          status: SubscriptionStatus.pending,
          type: SubscriptionType.paid,
        },
        orderBy: { created_at: 'desc' },
      });

      if (!pendingSub) {
        this.logger.warn(
          `handlePaymentSuccess: no pending subscription found for txId=${processorTxId}`,
        );
        return;
      }

      subscriptionId = pendingSub.id;
    }

    // Fee calculation — all values in kopecks
    const platformFee = Math.round(amountKopecks * PLATFORM_FEE_PERCENT);
    const processorFee = this.paymentsService.calculateProcessorFee(
      processor,
      amountKopecks,
    );
    const authorPayout = amountKopecks - platformFee - processorFee;

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Upsert Payment record and activate subscription in a transaction
    await this.prisma.$transaction(async (tx) => {
      if (payment) {
        await tx.payment.update({
          where: { id: payment!.id },
          data: {
            status: 'completed',
            paid_at: now,
            amount: amountKopecks,
            platform_fee: platformFee,
            processor_fee: processorFee,
            author_payout: authorPayout,
          },
        });
      } else {
        await tx.payment.create({
          data: {
            subscription_id: subscriptionId,
            amount: amountKopecks,
            platform_fee: platformFee,
            processor_fee: processorFee,
            author_payout: authorPayout,
            processor,
            processor_tx_id: processorTxId,
            status: 'completed',
            paid_at: now,
          },
        });
      }

      await tx.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: SubscriptionStatus.active,
          started_at: now,
          expires_at: expiresAt,
        },
      });
    });

    // Notify author — load publication author info for the notification
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        publication: { include: { author: true } },
        subscriber: true,
      },
    });

    if (subscription) {
      this.logger.log(
        `Payment confirmed: author ${subscription.publication.author.email} ` +
          `will receive ${authorPayout} kopecks from subscriber ${subscription.subscriber.email}`,
      );
      // TODO: trigger email notification to subscription.publication.author via EmailService
    }
  }

  /**
   * Handle a failed payment webhook.
   * Puts an active paid subscription into grace_period for GRACE_PERIOD_DAYS days.
   */
  async handlePaymentFailed(processorTxId: string) {
    this.logger.warn(`Payment failed: txId=${processorTxId}`);

    const payment = await this.prisma.payment.findFirst({
      where: { processor_tx_id: processorTxId },
      include: { subscription: true },
    });

    if (!payment) {
      this.logger.warn(
        `handlePaymentFailed: payment record not found for txId=${processorTxId}`,
      );
      return;
    }

    const graceUntil = new Date();
    graceUntil.setDate(graceUntil.getDate() + GRACE_PERIOD_DAYS);

    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'failed' },
      }),
      this.prisma.subscription.update({
        where: { id: payment.subscription_id },
        data: {
          status: SubscriptionStatus.grace_period,
          expires_at: graceUntil,
        },
      }),
    ]);
  }

  // ─── Cron Jobs ─────────────────────────────────────────────────────────────

  /**
   * Run every hour to expire subscriptions whose grace period has ended.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkGracePeriods() {
    const now = new Date();

    const result = await this.prisma.subscription.updateMany({
      where: {
        status: SubscriptionStatus.grace_period,
        expires_at: { lte: now },
      },
      data: { status: SubscriptionStatus.expired },
    });

    if (result.count > 0) {
      this.logger.log(
        `checkGracePeriods: expired ${result.count} subscription(s)`,
      );
    }
  }

  // ─── Queries ───────────────────────────────────────────────────────────────

  /**
   * Return all subscribers for a given publication.
   * Includes subscriber name, email, subscription type and status.
   */
  async getSubscribersByPublication(publicationId: string) {
    const publication = await this.prisma.publication.findUnique({
      where: { id: publicationId },
    });

    if (!publication) {
      throw new NotFoundException(`Publication "${publicationId}" not found`);
    }

    return this.prisma.subscription.findMany({
      where: {
        publication_id: publicationId,
        status: { in: [SubscriptionStatus.active, SubscriptionStatus.grace_period] },
      },
      include: {
        subscriber: {
          select: { id: true, name: true, email: true, avatar_url: true },
        },
      },
      orderBy: { started_at: 'desc' },
    });
  }

  /**
   * Return all subscriptions for a given user.
   */
  async getUserSubscriptions(userId: string) {
    return this.prisma.subscription.findMany({
      where: { subscriber_id: userId },
      include: {
        publication: {
          select: {
            id: true,
            name: true,
            slug: true,
            avatar_url: true,
            paid_price_monthly: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }
}
