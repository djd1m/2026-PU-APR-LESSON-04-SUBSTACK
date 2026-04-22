import { Logger } from '@nestjs/common';
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Resend } from 'resend';
import { ConfigService } from '@nestjs/config';
import { EmailDeliveryStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { SendEmailJobData } from './email.service';

/**
 * Bull queue processor for the 'email-send' queue.
 *
 * Each job carries { to, subject, html, articleId, subscriberId }.
 * On success: creates/updates EmailDelivery record with status = sent.
 * On failure after all retries: updates EmailDelivery to bounced.
 *
 * Retry policy (set in email.module.ts defaultJobOptions and per-job opts):
 *   attempts: 3, backoff: exponential, delay: 2 000 ms
 */
@Processor('email-send')
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);
  private readonly resend: Resend;
  private readonly fromAddress: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const apiKey = this.config.get<string>('resend.apiKey') ?? '';
    this.resend = new Resend(apiKey);
    const fromName = this.config.get<string>('resend.fromName') ?? 'SubStack RU';
    const fromEmail = this.config.get<string>('resend.fromEmail') ?? 'noreply@substackru.com';
    this.fromAddress = `${fromName} <${fromEmail}>`;
  }

  /**
   * Main processor — called by Bull for each 'email-send' job.
   * Throws on transient error so Bull can retry.
   */
  @Process()
  async handleSendEmail(job: Job<SendEmailJobData>): Promise<void> {
    const { to, subject, html, articleId, subscriberId } = job.data;

    this.logger.log(
      `Processing email job ${job.id}: to=${to} article=${articleId} attempt=${job.attemptsMade + 1}`,
    );

    // Ensure an EmailDelivery record exists (idempotent upsert)
    const delivery = await this.upsertDelivery(articleId, subscriberId);

    // Send via Resend
    const result = await this.resend.emails.send({
      from: this.fromAddress,
      to,
      subject,
      html,
    });

    if (result.error) {
      const msg = `Resend API error for job ${job.id}: ${result.error.message}`;
      this.logger.error(msg);

      // On last attempt, mark as bounced
      if (job.attemptsMade + 1 >= (job.opts.attempts ?? 3)) {
        await this.prisma.emailDelivery.update({
          where: { id: delivery.id },
          data: { status: EmailDeliveryStatus.bounced },
        });
      }

      throw new Error(msg);
    }

    // Mark as sent
    await this.prisma.emailDelivery.update({
      where: { id: delivery.id },
      data: {
        status: EmailDeliveryStatus.sent,
        sent_at: new Date(),
      },
    });

    this.logger.log(
      `Email delivered: job=${job.id} resend_id=${result.data?.id} to=${to}`,
    );
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  /**
   * Creates an EmailDelivery row if it does not already exist, and returns it.
   * Uses findFirst + create instead of upsert because there is no unique
   * constraint on (article_id, subscriber_id) in the schema.
   */
  private async upsertDelivery(articleId: string, subscriberId: string) {
    const existing = await this.prisma.emailDelivery.findFirst({
      where: { article_id: articleId, subscriber_id: subscriberId },
    });

    if (existing) return existing;

    return this.prisma.emailDelivery.create({
      data: {
        article_id: articleId,
        subscriber_id: subscriberId,
        status: EmailDeliveryStatus.queued,
      },
    });
  }
}
