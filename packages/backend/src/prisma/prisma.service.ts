import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'info' },
        { emit: 'stdout', level: 'warn' },
        { emit: 'stdout', level: 'error' },
      ],
    });
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('Connecting to PostgreSQL via Prisma...');
    await this.$connect();
    this.logger.log('Prisma connected successfully');
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Disconnecting Prisma...');
    await this.$disconnect();
  }

  /**
   * Helper for clean-up during testing — truncates all tables in order
   * that respects FK constraints.
   */
  async cleanDatabase(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('cleanDatabase() is not allowed in production');
    }
    await this.$transaction([
      this.tip.deleteMany(),
      this.referral.deleteMany(),
      this.recommendation.deleteMany(),
      this.emailDelivery.deleteMany(),
      this.payout.deleteMany(),
      this.payment.deleteMany(),
      this.subscription.deleteMany(),
      this.article.deleteMany(),
      this.publication.deleteMany(),
      this.user.deleteMany(),
    ]);
  }
}
