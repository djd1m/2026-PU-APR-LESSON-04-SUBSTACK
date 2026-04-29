import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from '../../prisma/prisma.module';
import { SettingsModule } from '../settings/settings.module';
import { EmailService } from './email.service';
import { EmailProcessor } from './email.processor';
import { EmailController } from './email.controller';

/**
 * EmailModule — delivers articles to subscribers via Resend + BullMQ.
 *
 * Queue: 'email-send'
 *   Processor: EmailProcessor (@Processor('email-send'))
 *   Producer:  EmailService (injects the queue via @InjectQueue)
 *
 * Retry policy is configured globally in AppModule (BullModule.forRootAsync)
 * and can be overridden per-job in EmailService.sendArticleToSubscribers.
 *
 * Webhook endpoint: POST /api/webhooks/resend
 */
@Module({
  imports: [
    PrismaModule,
    SettingsModule,
    BullModule.registerQueue({
      name: 'email-send',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    }),
  ],
  controllers: [EmailController],
  providers: [EmailService, EmailProcessor],
  exports: [EmailService],
})
export class EmailModule {}
