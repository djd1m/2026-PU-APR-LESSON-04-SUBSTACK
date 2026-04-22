import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EmailDeliveryStatus, SubscriptionStatus, SubscriptionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

// Platform fee rate (10%) — must stay in sync with subscriptions.service.ts
const PLATFORM_FEE_PERCENT = 0.1;

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Overview ──────────────────────────────────────────────────────────────

  /**
   * Return a high-level analytics overview for an author.
   *
   * Covers all publications owned by the author:
   *   - totalSubscribers   — all active/grace_period subscribers (free + paid)
   *   - paidSubscribers    — active/grace_period paid subscribers
   *   - mrr                — monthly recurring revenue in kopecks
   *                          (sum of paid_price_monthly for active paid subscriptions)
   *   - emailOpenRate      — average open rate across email deliveries for
   *                          articles published in the last 30 days
   *   - growth.last7d      — net new subscribers in the last 7 days
   *   - growth.last30d     — net new subscribers in the last 30 days
   */
  async getOverview(authorId: string) {
    // Verify the author exists
    const author = await this.prisma.user.findUnique({ where: { id: authorId } });
    if (!author) {
      throw new NotFoundException(`Author "${authorId}" not found`);
    }

    // Load all publication IDs belonging to this author
    const publications = await this.prisma.publication.findMany({
      where: { author_id: authorId },
      select: { id: true, paid_price_monthly: true },
    });

    if (publications.length === 0) {
      return {
        totalSubscribers: 0,
        paidSubscribers: 0,
        mrr: 0,
        emailOpenRate: 0,
        growth: { last7d: 0, last30d: 0 },
      };
    }

    const publicationIds = publications.map((p) => p.id);
    const publicationPriceMap = new Map(publications.map((p) => [p.id, p.paid_price_monthly]));

    const activeStatuses = [SubscriptionStatus.active, SubscriptionStatus.grace_period];

    // ── Total subscribers ─────────────────────────────────────────────────────
    const totalSubscribers = await this.prisma.subscription.count({
      where: {
        publication_id: { in: publicationIds },
        status: { in: activeStatuses },
      },
    });

    // ── Paid subscribers + MRR ────────────────────────────────────────────────
    const paidSubscriptions = await this.prisma.subscription.findMany({
      where: {
        publication_id: { in: publicationIds },
        type: SubscriptionType.paid,
        status: { in: activeStatuses },
      },
      select: { publication_id: true },
    });

    const paidSubscribers = paidSubscriptions.length;

    // MRR = sum of the monthly price for each active paid subscription
    const mrr = paidSubscriptions.reduce((sum, sub) => {
      const price = publicationPriceMap.get(sub.publication_id) ?? 0;
      return sum + price;
    }, 0);

    // ── Email open rate (last 30 days) ────────────────────────────────────────
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Articles published in the last 30 days for this author's publications
    const recentArticles = await this.prisma.article.findMany({
      where: {
        publication_id: { in: publicationIds },
        published_at: { gte: thirtyDaysAgo },
      },
      select: { id: true },
    });

    let emailOpenRate = 0;

    if (recentArticles.length > 0) {
      const articleIds = recentArticles.map((a) => a.id);

      const totalDeliveries = await this.prisma.emailDelivery.count({
        where: { article_id: { in: articleIds } },
      });

      const totalOpens = await this.prisma.emailDelivery.count({
        where: {
          article_id: { in: articleIds },
          status: {
            in: [
              EmailDeliveryStatus.opened,
              EmailDeliveryStatus.clicked,
            ],
          },
        },
      });

      emailOpenRate = totalDeliveries > 0
        ? Math.round((totalOpens / totalDeliveries) * 10000) / 100  // percentage with 2dp
        : 0;
    }

    // ── Growth ────────────────────────────────────────────────────────────────
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [growth7d, growth30d] = await Promise.all([
      this.prisma.subscription.count({
        where: {
          publication_id: { in: publicationIds },
          started_at: { gte: sevenDaysAgo },
        },
      }),
      this.prisma.subscription.count({
        where: {
          publication_id: { in: publicationIds },
          started_at: { gte: thirtyDaysAgo },
        },
      }),
    ]);

    this.logger.debug(
      `getOverview: author=${authorId} totalSubs=${totalSubscribers} paidSubs=${paidSubscribers} MRR=${mrr}`,
    );

    return {
      totalSubscribers,
      paidSubscribers,
      mrr,
      emailOpenRate,
      growth: {
        last7d: growth7d,
        last30d: growth30d,
      },
    };
  }

  // ─── Article Analytics ─────────────────────────────────────────────────────

  /**
   * Return per-article email delivery stats.
   *
   * Verifies that the article belongs to a publication owned by authorId.
   *
   * Returns:
   *   - emailDeliveries   — total delivery records
   *   - opens             — deliveries with status opened or clicked
   *   - clicks            — deliveries with status clicked
   *   - openRate          — opens / deliveries (percentage)
   *   - clickRate         — clicks / deliveries (percentage)
   *   - newSubscribers    — subscriptions created on the same calendar day
   *                         the article was published (proxy metric)
   */
  async getArticleAnalytics(articleId: string, authorId: string) {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      include: { publication: { select: { author_id: true } } },
    });

    if (!article) {
      throw new NotFoundException(`Article "${articleId}" not found`);
    }

    if (article.publication.author_id !== authorId) {
      throw new ForbiddenException('You do not own this article');
    }

    const [emailDeliveries, opens, clicks] = await Promise.all([
      this.prisma.emailDelivery.count({ where: { article_id: articleId } }),
      this.prisma.emailDelivery.count({
        where: {
          article_id: articleId,
          status: {
            in: [EmailDeliveryStatus.opened, EmailDeliveryStatus.clicked],
          },
        },
      }),
      this.prisma.emailDelivery.count({
        where: { article_id: articleId, status: EmailDeliveryStatus.clicked },
      }),
    ]);

    const openRate = emailDeliveries > 0
      ? Math.round((opens / emailDeliveries) * 10000) / 100
      : 0;

    const clickRate = emailDeliveries > 0
      ? Math.round((clicks / emailDeliveries) * 10000) / 100
      : 0;

    // New subscribers on the publish day (as a rough "from this article" metric)
    let newSubscribers = 0;
    if (article.published_at) {
      const dayStart = new Date(article.published_at);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      newSubscribers = await this.prisma.subscription.count({
        where: {
          publication_id: article.publication_id,
          started_at: { gte: dayStart, lt: dayEnd },
        },
      });
    }

    return {
      emailDeliveries,
      opens,
      clicks,
      openRate,
      clickRate,
      newSubscribers,
    };
  }

  // ─── Revenue Analytics ─────────────────────────────────────────────────────

  /**
   * Return revenue analytics for an author within a date range.
   *
   * Aggregates completed Payment rows for subscriptions belonging to the
   * author's publications, plus completed Tip rows for those publications.
   *
   * Returns (all values in kopecks):
   *   - totalRevenue    — gross amount received
   *   - platformFees    — platform's 10% cut
   *   - processorFees   — payment processor fees
   *   - netPayout       — author's take-home (author_payout field)
   *   - byMonth         — array of { month: "YYYY-MM", revenue, net } objects
   */
  async getRevenueAnalytics(authorId: string, from: Date, to: Date) {
    const author = await this.prisma.user.findUnique({ where: { id: authorId } });
    if (!author) {
      throw new NotFoundException(`Author "${authorId}" not found`);
    }

    // Gather publication IDs for this author
    const publications = await this.prisma.publication.findMany({
      where: { author_id: authorId },
      select: { id: true },
    });

    if (publications.length === 0) {
      return {
        totalRevenue: 0,
        platformFees: 0,
        processorFees: 0,
        netPayout: 0,
        byMonth: [],
      };
    }

    const publicationIds = publications.map((p) => p.id);

    // Find subscriptions belonging to these publications
    const subscriptions = await this.prisma.subscription.findMany({
      where: { publication_id: { in: publicationIds } },
      select: { id: true },
    });
    const subscriptionIds = subscriptions.map((s) => s.id);

    // ── Aggregate payments ────────────────────────────────────────────────────
    const payments = await this.prisma.payment.findMany({
      where: {
        subscription_id: { in: subscriptionIds },
        status: 'completed',
        paid_at: { gte: from, lte: to },
      },
      select: {
        amount: true,
        platform_fee: true,
        processor_fee: true,
        author_payout: true,
        paid_at: true,
      },
    });

    // ── Aggregate tips ────────────────────────────────────────────────────────
    const tips = await this.prisma.tip.findMany({
      where: {
        to_publication_id: { in: publicationIds },
        status: 'completed',
        created_at: { gte: from, lte: to },
      },
      select: {
        amount: true,
        platform_fee: true,
        created_at: true,
      },
    });

    // ── Totals ────────────────────────────────────────────────────────────────
    let totalRevenue = 0;
    let platformFees = 0;
    let processorFees = 0;
    let netPayout = 0;

    // Monthly buckets: key = "YYYY-MM"
    const monthlyMap = new Map<string, { revenue: number; net: number }>();

    const getMonthKey = (date: Date | null): string => {
      if (!date) return 'unknown';
      const d = new Date(date);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    };

    for (const payment of payments) {
      totalRevenue += payment.amount;
      platformFees += payment.platform_fee;
      processorFees += payment.processor_fee;
      netPayout += payment.author_payout;

      const key = getMonthKey(payment.paid_at);
      const bucket = monthlyMap.get(key) ?? { revenue: 0, net: 0 };
      bucket.revenue += payment.amount;
      bucket.net += payment.author_payout;
      monthlyMap.set(key, bucket);
    }

    for (const tip of tips) {
      // For tips: net = amount - platform_fee (no separate processor_fee tracked)
      const tipNet = tip.amount - tip.platform_fee;
      totalRevenue += tip.amount;
      platformFees += tip.platform_fee;
      netPayout += tipNet;

      const key = getMonthKey(tip.created_at);
      const bucket = monthlyMap.get(key) ?? { revenue: 0, net: 0 };
      bucket.revenue += tip.amount;
      bucket.net += tipNet;
      monthlyMap.set(key, bucket);
    }

    // Sort months chronologically
    const byMonth = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, ...data }));

    this.logger.debug(
      `getRevenueAnalytics: author=${authorId} from=${from.toISOString()} to=${to.toISOString()} ` +
        `totalRevenue=${totalRevenue} netPayout=${netPayout}`,
    );

    return {
      totalRevenue,
      platformFees,
      processorFees,
      netPayout,
      byMonth,
    };
  }
}
