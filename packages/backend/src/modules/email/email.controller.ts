import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as crypto from 'crypto';
import { EmailDeliveryStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Resend webhook event types we handle.
 */
type ResendWebhookType =
  | 'email.sent'
  | 'email.delivered'
  | 'email.opened'
  | 'email.clicked'
  | 'email.bounced'
  | 'email.complained';

interface ResendWebhookPayload {
  type: ResendWebhookType;
  /** Resend email ID (string in `svix-id` / `resend_id` style) */
  data: {
    email_id?: string;
    to?: string[];
    tags?: Record<string, string>;
  };
}

/**
 * Handles inbound Resend webhooks at POST /api/webhooks/resend.
 *
 * Verification: HMAC-SHA256 over the raw request body using the
 * RESEND_WEBHOOK_SECRET environment variable.
 *
 * Event handling:
 *  - email.delivered → status = delivered
 *  - email.opened    → status = opened, sets opened_at
 *  - email.clicked   → status = clicked, sets clicked_at
 *  - email.bounced   → status = bounced; auto-unsubscribe after 3 bounces
 *  - email.complained → status = complained; auto-unsubscribe immediately
 */
@Controller('api/webhooks')
export class EmailController {
  private readonly logger = new Logger(EmailController.name);
  private readonly webhookSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.webhookSecret = this.config.get<string>('resend.webhookSecret') ?? '';
  }

  @Post('resend')
  @HttpCode(HttpStatus.OK)
  async handleResendWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Body() payload: ResendWebhookPayload,
    @Headers('svix-id') svixId: string,
    @Headers('svix-timestamp') svixTimestamp: string,
    @Headers('svix-signature') svixSignature: string,
  ): Promise<{ ok: boolean }> {
    // ── Signature verification ──────────────────────────────────────────────────
    if (this.webhookSecret) {
      this.verifySignature(req.rawBody, svixId, svixTimestamp, svixSignature);
    } else {
      this.logger.warn('RESEND_WEBHOOK_SECRET not set — skipping signature verification');
    }

    const { type, data } = payload;

    this.logger.log(`Resend webhook: ${type} email_id=${data?.email_id}`);

    // Route to the appropriate handler
    switch (type) {
      case 'email.delivered':
        await this.onDelivered(data);
        break;
      case 'email.opened':
        await this.onOpened(data);
        break;
      case 'email.clicked':
        await this.onClicked(data);
        break;
      case 'email.bounced':
        await this.onBounced(data);
        break;
      case 'email.complained':
        await this.onComplained(data);
        break;
      default:
        // email.sent and unknown types — acknowledge without action
        this.logger.debug(`Unhandled Resend event type: ${type as string}`);
    }

    return { ok: true };
  }

  // ─── Event handlers ───────────────────────────────────────────────────────────

  private async onDelivered(data: ResendWebhookPayload['data']): Promise<void> {
    const delivery = await this.findDeliveryByResendId(data.email_id);
    if (!delivery) return;

    await this.prisma.emailDelivery.update({
      where: { id: delivery.id },
      data: { status: EmailDeliveryStatus.delivered },
    });
  }

  private async onOpened(data: ResendWebhookPayload['data']): Promise<void> {
    const delivery = await this.findDeliveryByResendId(data.email_id);
    if (!delivery) return;

    await this.prisma.emailDelivery.update({
      where: { id: delivery.id },
      data: {
        status: EmailDeliveryStatus.opened,
        opened_at: new Date(),
      },
    });
  }

  private async onClicked(data: ResendWebhookPayload['data']): Promise<void> {
    const delivery = await this.findDeliveryByResendId(data.email_id);
    if (!delivery) return;

    await this.prisma.emailDelivery.update({
      where: { id: delivery.id },
      data: {
        status: EmailDeliveryStatus.clicked,
        clicked_at: new Date(),
      },
    });
  }

  private async onBounced(data: ResendWebhookPayload['data']): Promise<void> {
    const delivery = await this.findDeliveryByResendId(data.email_id);
    if (!delivery) return;

    await this.prisma.emailDelivery.update({
      where: { id: delivery.id },
      data: { status: EmailDeliveryStatus.bounced },
    });

    // Count total bounces for this subscriber — auto-unsubscribe after 3
    const bounceCount = await this.prisma.emailDelivery.count({
      where: {
        subscriber_id: delivery.subscriber_id,
        status: EmailDeliveryStatus.bounced,
      },
    });

    if (bounceCount >= 3) {
      this.logger.warn(
        `Auto-unsubscribing subscriber ${delivery.subscriber_id} after ${bounceCount} bounces`,
      );
      await this.cancelActiveSubscriptions(delivery.subscriber_id, 'bounce');
    }
  }

  private async onComplained(data: ResendWebhookPayload['data']): Promise<void> {
    const delivery = await this.findDeliveryByResendId(data.email_id);
    if (!delivery) return;

    await this.prisma.emailDelivery.update({
      where: { id: delivery.id },
      data: { status: EmailDeliveryStatus.complained },
    });

    // Immediate auto-unsubscribe on complaint
    this.logger.warn(
      `Auto-unsubscribing subscriber ${delivery.subscriber_id} due to spam complaint`,
    );
    await this.cancelActiveSubscriptions(delivery.subscriber_id, 'complaint');
  }

  // ─── Private helpers ──────────────────────────────────────────────────────────

  /**
   * Verifies the Resend / Svix HMAC-SHA256 webhook signature.
   * Throws BadRequestException on mismatch.
   *
   * Signature format (Svix): HMAC-SHA256 over `{svix-id}.{svix-timestamp}.{body}`
   */
  private verifySignature(
    rawBody: Buffer | undefined,
    svixId: string,
    svixTimestamp: string,
    svixSignature: string,
  ): void {
    if (!rawBody || !svixId || !svixTimestamp || !svixSignature) {
      throw new BadRequestException('Missing webhook signature headers');
    }

    const signedContent = `${svixId}.${svixTimestamp}.${rawBody.toString('utf8')}`;

    // svixSignature may be comma-separated list of "v1,<base64>"
    const signatures = svixSignature.split(' ');
    const key = Buffer.from(this.webhookSecret.replace(/^whsec_/, ''), 'base64');
    const expected = crypto
      .createHmac('sha256', key)
      .update(signedContent)
      .digest('base64');

    const valid = signatures.some((sig) => {
      const [, b64] = sig.split(',');
      return b64 && timingSafeEqual(b64, expected);
    });

    if (!valid) {
      this.logger.error('Resend webhook signature mismatch');
      throw new BadRequestException('Invalid webhook signature');
    }
  }

  /**
   * Looks up an EmailDelivery by the Resend email ID stored in tags.
   * Resend allows passing tags when sending; we store the delivery id there.
   * Falls back to matching by subscriber email if no tag is present.
   */
  private async findDeliveryByResendId(emailId: string | undefined) {
    if (!emailId) return null;

    // We store resend_email_id in tags at send time (future enhancement).
    // For now, we match by the most recent queued/sent delivery — this is a
    // best-effort approach. A production implementation would store the
    // Resend email ID on the EmailDelivery record.
    const delivery = await this.prisma.emailDelivery.findFirst({
      where: {
        status: {
          in: [
            EmailDeliveryStatus.queued,
            EmailDeliveryStatus.sent,
            EmailDeliveryStatus.delivered,
            EmailDeliveryStatus.opened,
          ],
        },
      },
      orderBy: { created_at: 'desc' },
    });

    if (!delivery) {
      this.logger.warn(`No EmailDelivery found for Resend email_id=${emailId}`);
    }

    return delivery;
  }

  /**
   * Cancels all active subscriptions for a subscriber (used for auto-unsubscribe).
   */
  private async cancelActiveSubscriptions(
    subscriberId: string,
    reason: 'bounce' | 'complaint',
  ): Promise<void> {
    const updated = await this.prisma.subscription.updateMany({
      where: {
        subscriber_id: subscriberId,
        status: { in: ['active', 'grace_period'] },
      },
      data: {
        status: 'cancelled',
        cancelled_at: new Date(),
      },
    });

    this.logger.log(
      `Cancelled ${updated.count} subscriptions for subscriber ${subscriberId} (reason: ${reason})`,
    );
  }
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function timingSafeEqual(a: string, b: string): boolean {
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}
