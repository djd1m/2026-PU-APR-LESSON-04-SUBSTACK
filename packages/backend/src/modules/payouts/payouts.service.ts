import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PayoutStatus, SubscriptionStatus, SubscriptionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BankDetailsDto } from './dto/bank-details.dto';

/**
 * Minimum payout threshold: 1 000 RUB = 100 000 kopecks.
 * Authors must have accumulated at least this amount before a payout is created.
 */
export const MINIMUM_PAYOUT = 100_000; // kopecks

// Platform fee rate (10%) — must stay in sync with subscriptions.service.ts
const PLATFORM_FEE_PERCENT = 0.1;

@Injectable()
export class PayoutsService {
  private readonly logger = new Logger(PayoutsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Pending Balance ────────────────────────────────────────────────────────

  /**
   * Return the current accumulated balance (in kopecks) that has not yet been
   * included in a Payout record.
   *
   * Balance = sum of author_payout from completed Payments + net from completed Tips
   *           minus amounts already covered by existing Payout records (any status).
   */
  async getPendingBalance(authorId: string): Promise<{ pendingBalance: number }> {
    const author = await this.prisma.user.findUnique({ where: { id: authorId } });
    if (!author) {
      throw new NotFoundException(`Author "${authorId}" not found`);
    }

    const publications = await this.prisma.publication.findMany({
      where: { author_id: authorId },
      select: { id: true },
    });

    if (publications.length === 0) {
      return { pendingBalance: 0 };
    }

    const publicationIds = publications.map((p) => p.id);

    // Subscriptions for this author's publications
    const subscriptions = await this.prisma.subscription.findMany({
      where: { publication_id: { in: publicationIds } },
      select: { id: true },
    });
    const subscriptionIds = subscriptions.map((s) => s.id);

    // Sum of author_payout from all completed payments
    const paymentAgg = await this.prisma.payment.aggregate({
      where: { subscription_id: { in: subscriptionIds }, status: 'completed' },
      _sum: { author_payout: true },
    });

    // Sum of net from completed tips (amount - platform_fee)
    const completedTips = await this.prisma.tip.findMany({
      where: { to_publication_id: { in: publicationIds }, status: 'completed' },
      select: { amount: true, platform_fee: true },
    });

    const tipNet = completedTips.reduce(
      (sum, tip) => sum + tip.amount - tip.platform_fee,
      0,
    );

    const totalEarned = (paymentAgg._sum.author_payout ?? 0) + tipNet;

    // Subtract amounts already captured in existing Payout records
    const payoutAgg = await this.prisma.payout.aggregate({
      where: { author_id: authorId },
      _sum: { amount: true },
    });

    const alreadyPaidOut = payoutAgg._sum.amount ?? 0;
    const pendingBalance = Math.max(0, totalEarned - alreadyPaidOut);

    return { pendingBalance };
  }

  // ─── Calculate & Create Monthly Payout ─────────────────────────────────────

  /**
   * Calculate payout for a single author for a given period and create a Payout
   * record if the accumulated balance meets the minimum threshold.
   *
   * Steps:
   *   1. Sum all completed Payments (author_payout) in the period.
   *   2. Sum all completed Tips (amount - platform_fee) in the period.
   *   3. If total >= MINIMUM_PAYOUT, create a Payout record with status "pending".
   *   4. Return the Payout record or null if below threshold.
   */
  async calculateMonthlyPayout(
    authorId: string,
    periodStart: Date,
    periodEnd: Date,
  ) {
    const { pendingBalance } = await this.getPendingBalance(authorId);

    if (pendingBalance < MINIMUM_PAYOUT) {
      this.logger.debug(
        `calculateMonthlyPayout: author=${authorId} balance=${pendingBalance} < minimum=${MINIMUM_PAYOUT} — skipped`,
      );
      return null;
    }

    // Retrieve bank details from the most recent pending/completed payout or user metadata.
    // We use the last payout's bank_account as a best-effort source.
    // If no previous payout exists, we use a placeholder — real flows should
    // ensure bank details are saved via PATCH /api/author/payouts/bank-details.
    const lastPayout = await this.prisma.payout.findFirst({
      where: { author_id: authorId },
      orderBy: { created_at: 'desc' },
      select: { bank_account: true },
    });

    const bankAccount = lastPayout?.bank_account ?? '{}';

    const payout = await this.prisma.payout.create({
      data: {
        author_id: authorId,
        amount: pendingBalance,
        status: PayoutStatus.pending,
        bank_account: bankAccount,
        period_start: periodStart,
        period_end: periodEnd,
      },
    });

    this.logger.log(
      `calculateMonthlyPayout: created payout ${payout.id} for author=${authorId} ` +
        `amount=${pendingBalance} kopecks`,
    );

    return payout;
  }

  // ─── Payout History ─────────────────────────────────────────────────────────

  /**
   * Return all past payout records for an author, ordered newest first.
   */
  async getPayoutHistory(authorId: string) {
    const author = await this.prisma.user.findUnique({ where: { id: authorId } });
    if (!author) {
      throw new NotFoundException(`Author "${authorId}" not found`);
    }

    return this.prisma.payout.findMany({
      where: { author_id: authorId },
      orderBy: { created_at: 'desc' },
    });
  }

  // ─── Revenue Breakdown ──────────────────────────────────────────────────────

  /**
   * Return a full revenue breakdown for an author:
   *   - pendingBalance — unpaid accumulated earnings in kopecks
   *   - lifetimeRevenue — all-time gross revenue in kopecks
   *   - lifetimePlatformFees
   *   - lifetimeProcessorFees
   *   - lifetimeNet — net author earnings all-time
   *   - payouts — list of all payout records
   */
  async getRevenueBreakdown(authorId: string) {
    const author = await this.prisma.user.findUnique({ where: { id: authorId } });
    if (!author) {
      throw new NotFoundException(`Author "${authorId}" not found`);
    }

    const publications = await this.prisma.publication.findMany({
      where: { author_id: authorId },
      select: { id: true },
    });

    if (publications.length === 0) {
      return {
        pendingBalance: 0,
        lifetimeRevenue: 0,
        lifetimePlatformFees: 0,
        lifetimeProcessorFees: 0,
        lifetimeNet: 0,
        payouts: [],
      };
    }

    const publicationIds = publications.map((p) => p.id);

    const subscriptions = await this.prisma.subscription.findMany({
      where: { publication_id: { in: publicationIds } },
      select: { id: true },
    });
    const subscriptionIds = subscriptions.map((s) => s.id);

    const paymentAgg = await this.prisma.payment.aggregate({
      where: { subscription_id: { in: subscriptionIds }, status: 'completed' },
      _sum: {
        amount: true,
        platform_fee: true,
        processor_fee: true,
        author_payout: true,
      },
    });

    const completedTips = await this.prisma.tip.findMany({
      where: { to_publication_id: { in: publicationIds }, status: 'completed' },
      select: { amount: true, platform_fee: true },
    });

    const tipGross = completedTips.reduce((s, t) => s + t.amount, 0);
    const tipFees = completedTips.reduce((s, t) => s + t.platform_fee, 0);
    const tipNet = tipGross - tipFees;

    const lifetimeRevenue = (paymentAgg._sum.amount ?? 0) + tipGross;
    const lifetimePlatformFees = (paymentAgg._sum.platform_fee ?? 0) + tipFees;
    const lifetimeProcessorFees = paymentAgg._sum.processor_fee ?? 0;
    const lifetimeNet = (paymentAgg._sum.author_payout ?? 0) + tipNet;

    const payoutAgg = await this.prisma.payout.aggregate({
      where: { author_id: authorId },
      _sum: { amount: true },
    });
    const alreadyPaidOut = payoutAgg._sum.amount ?? 0;
    const pendingBalance = Math.max(0, lifetimeNet - alreadyPaidOut);

    const payouts = await this.prisma.payout.findMany({
      where: { author_id: authorId },
      orderBy: { created_at: 'desc' },
    });

    return {
      pendingBalance,
      lifetimeRevenue,
      lifetimePlatformFees,
      lifetimeProcessorFees,
      lifetimeNet,
      payouts,
    };
  }

  // ─── Save Bank Details ──────────────────────────────────────────────────────

  /**
   * Persist bank details for an author.
   *
   * Bank details are stored as a JSON string in the Payout.bank_account column.
   * We create a sentinel Payout record (amount=0, status=completed) so that
   * subsequent payout calculations can retrieve them without a separate table.
   *
   * Returns the saved bank details DTO.
   */
  async saveBankDetails(authorId: string, dto: BankDetailsDto) {
    const author = await this.prisma.user.findUnique({ where: { id: authorId } });
    if (!author) {
      throw new NotFoundException(`Author "${authorId}" not found`);
    }

    const bankAccount = JSON.stringify({
      bankName: dto.bankName,
      bik: dto.bik,
      accountNumber: dto.accountNumber,
      inn: dto.inn ?? null,
    });

    // Use a sentinel payout (amount=0, completed) as bank-details storage.
    // A future migration could add a dedicated bank_details column to users.
    await this.prisma.payout.create({
      data: {
        author_id: authorId,
        amount: 0,
        status: PayoutStatus.completed,
        bank_account: bankAccount,
        period_start: new Date(),
        period_end: new Date(),
        completed_at: new Date(),
      },
    });

    this.logger.log(`saveBankDetails: updated bank details for author=${authorId}`);

    return { message: 'Bank details saved successfully', ...dto };
  }

  // ─── Cron: Monthly Payout Processing ───────────────────────────────────────

  /**
   * Run on the 1st of every month at 03:00 UTC.
   * Calculates and creates Payout records for all authors whose pending
   * balance is >= MINIMUM_PAYOUT.
   */
  @Cron('0 3 1 * *')
  async processPayouts() {
    this.logger.log('processPayouts: starting monthly payout run');

    // All users with role = author
    const authors = await this.prisma.user.findMany({
      where: { role: 'author' },
      select: { id: true },
    });

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth(), 0); // last day of previous month

    let created = 0;
    let skipped = 0;

    for (const author of authors) {
      try {
        const payout = await this.calculateMonthlyPayout(
          author.id,
          periodStart,
          periodEnd,
        );

        if (payout) {
          created++;
        } else {
          skipped++;
        }
      } catch (err) {
        this.logger.error(
          `processPayouts: failed for author=${author.id}`,
          err instanceof Error ? err.stack : String(err),
        );
      }
    }

    this.logger.log(
      `processPayouts: completed — created=${created} skipped=${skipped} total=${authors.length}`,
    );
  }
}
