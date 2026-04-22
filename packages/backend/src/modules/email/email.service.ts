import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Resend } from 'resend';
import { ArticleVisibility, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { articleEmailHtml } from './templates/article';

export interface SendEmailJobData {
  to: string;
  subject: string;
  html: string;
  articleId: string;
  subscriberId: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend;
  private readonly fromAddress: string;
  private readonly baseUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @InjectQueue('email-send') private readonly emailQueue: Queue<SendEmailJobData>,
  ) {
    const apiKey = this.config.get<string>('resend.apiKey') ?? '';
    this.resend = new Resend(apiKey);
    const fromName = this.config.get<string>('resend.fromName') ?? 'SubStack RU';
    const fromEmail = this.config.get<string>('resend.fromEmail') ?? 'noreply@substackru.com';
    this.fromAddress = `${fromName} <${fromEmail}>`;
    this.baseUrl = this.config.get<string>('app.baseUrl') ?? 'http://localhost:3000';
  }

  // ─── Public API ───────────────────────────────────────────────────────────────

  /**
   * Fetches article + its publication + all active subscribers, then enqueues
   * one Bull job per subscriber. Free articles go to all subscribers; paid
   * articles use a teaser for free-tier subscribers.
   */
  async sendArticleToSubscribers(articleId: string): Promise<void> {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      include: {
        publication: {
          select: { id: true, name: true, slug: true, description: true },
        },
      },
    });

    if (!article) {
      this.logger.warn(`sendArticleToSubscribers: article ${articleId} not found`);
      return;
    }

    if (article.email_sent) {
      this.logger.warn(`sendArticleToSubscribers: article ${articleId} already sent`);
      return;
    }

    // Fetch all active subscribers of this publication
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        publication_id: article.publication_id,
        status: SubscriptionStatus.active,
      },
      include: {
        subscriber: { select: { id: true, email: true, name: true } },
      },
    });

    if (subscriptions.length === 0) {
      this.logger.log(`sendArticleToSubscribers: no active subscribers for article ${articleId}`);
      await this.markArticleEmailSent(articleId);
      return;
    }

    const publication = article.publication;
    const isPaidArticle = article.visibility === ArticleVisibility.paid;

    const jobs = subscriptions.map((sub: typeof subscriptions[number]) => {
      const isPaidSubscriber = sub.type === 'paid';
      const isTeaser = isPaidArticle && !isPaidSubscriber;

      const unsubscribeUrl = `${this.baseUrl}/api/subscriptions/${sub.id}/unsubscribe`;
      const html = articleEmailHtml(
        {
          id: article.id,
          title: article.title,
          excerpt: article.excerpt,
          content_html: article.content_html,
          cover_image_url: article.cover_image_url,
          slug: article.slug,
        },
        {
          name: publication.name,
          slug: publication.slug,
          description: publication.description,
        },
        isTeaser,
        unsubscribeUrl,
      );

      const subject = isTeaser
        ? `[${publication.name}] ${article.title} (платный материал)`
        : `[${publication.name}] ${article.title}`;

      return {
        data: {
          to: sub.subscriber.email,
          subject,
          html,
          articleId: article.id,
          subscriberId: sub.subscriber.id,
        } satisfies SendEmailJobData,
        opts: {
          attempts: 3,
          backoff: { type: 'exponential' as const, delay: 2000 },
        },
      };
    });

    // Bulk-add to queue
    await this.emailQueue.addBulk(
      jobs.map((j: { data: SendEmailJobData; opts: object }) => ({ data: j.data, opts: j.opts })),
    );

    await this.markArticleEmailSent(articleId);

    this.logger.log(
      `sendArticleToSubscribers: queued ${jobs.length} emails for article ${articleId}`,
    );
  }

  /**
   * Sends a single transactional email via Resend immediately (no queue).
   */
  async sendEmail(to: string, subject: string, html: string): Promise<string | null> {
    try {
      const result = await this.resend.emails.send({
        from: this.fromAddress,
        to,
        subject,
        html,
      });

      if (result.error) {
        this.logger.error(`Resend error for ${to}: ${result.error.message}`);
        return null;
      }

      this.logger.log(`Email sent to ${to} (id: ${result.data?.id})`);
      return result.data?.id ?? null;
    } catch (err) {
      this.logger.error(`sendEmail failed for ${to}`, err);
      return null;
    }
  }

  /**
   * Sends an email-verification link to the given address.
   */
  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const verifyUrl = `${this.baseUrl}/api/auth/verify-email?token=${token}`;
    const html = `
      <!DOCTYPE html>
      <html lang="ru">
      <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f4f5;padding:32px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#fff;border-radius:8px;padding:32px;">
          <tr><td>
            <h2 style="margin:0 0 16px;color:#111;">Подтвердите email</h2>
            <p style="color:#374151;line-height:1.6;margin:0 0 24px;">
              Нажмите кнопку ниже, чтобы подтвердить ваш адрес электронной почты.
              Ссылка действительна 24 часа.
            </p>
            <a href="${verifyUrl}" style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600;">
              Подтвердить email
            </a>
            <p style="color:#6b7280;font-size:13px;margin-top:24px;">
              Если вы не регистрировались на SubStack RU — просто проигнорируйте это письмо.
            </p>
          </td></tr>
        </table>
      </body>
      </html>
    `;

    await this.sendEmail(email, 'Подтвердите ваш email — SubStack RU', html);
  }

  /**
   * Sends a payment-failed notification prompting the subscriber to retry.
   */
  async sendPaymentFailedEmail(email: string, publicationName: string): Promise<void> {
    const frontendUrl = this.config.get<string>('app.frontendUrl') ?? 'http://localhost:5173';
    const retryUrl = `${frontendUrl}/settings/billing`;

    const html = `
      <!DOCTYPE html>
      <html lang="ru">
      <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f4f5;padding:32px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#fff;border-radius:8px;padding:32px;">
          <tr><td>
            <h2 style="margin:0 0 16px;color:#111;">Не удалось списать оплату</h2>
            <p style="color:#374151;line-height:1.6;margin:0 0 8px;">
              Не удалось продлить подписку на <strong>${escapeHtml(publicationName)}</strong>.
            </p>
            <p style="color:#374151;line-height:1.6;margin:0 0 24px;">
              Проверьте данные карты и попробуйте снова, чтобы не потерять доступ к контенту.
            </p>
            <a href="${retryUrl}" style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600;">
              Обновить способ оплаты
            </a>
            <p style="color:#6b7280;font-size:13px;margin-top:24px;">
              Если у вас есть вопросы, ответьте на это письмо.
            </p>
          </td></tr>
        </table>
      </body>
      </html>
    `;

    await this.sendEmail(email, `Проблема с оплатой подписки на ${publicationName}`, html);
  }

  // ─── Private helpers ──────────────────────────────────────────────────────────

  private async markArticleEmailSent(articleId: string): Promise<void> {
    await this.prisma.article.update({
      where: { id: articleId },
      data: { email_sent: true },
    });
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
