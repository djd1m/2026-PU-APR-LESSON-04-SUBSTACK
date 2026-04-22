import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import configuration from './config/configuration';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';

// Feature modules — stubbed for now, will be fleshed out per feature
import { AdminModule } from './modules/admin/admin.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { ArticlesModule } from './modules/articles/articles.module';
import { EmailModule } from './modules/email/email.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PayoutsModule } from './modules/payouts/payouts.module';
import { PublicationsModule } from './modules/publications/publications.module';
import { RecommendationsModule } from './modules/recommendations/recommendations.module';
import { ReferralsModule } from './modules/referrals/referrals.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { TipsModule } from './modules/tips/tips.module';

@Module({
  imports: [
    // ── Global config ──────────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),

    // ── Global rate-limiting ───────────────────────────────────────────────────
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: () => ({
        throttlers: [
          {
            name: 'default',
            ttl: 60_000, // 1 minute window
            limit: 100,  // max 100 requests per window per IP
          },
          {
            name: 'auth',
            ttl: 60_000,
            limit: 10,   // stricter limit for auth endpoints
          },
        ],
      }),
    }),

    // ── Bull queue with Redis ──────────────────────────────────────────────────
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get<string>('redis.host') ?? 'localhost',
          port: config.get<number>('redis.port') ?? 6380,
          password: config.get<string>('redis.password'),
        },
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
    }),

    // ── Core modules ──────────────────────────────────────────────────────────
    PrismaModule,
    AuthModule,
    HealthModule,

    // ── Feature modules ───────────────────────────────────────────────────────
    PublicationsModule,
    ArticlesModule,
    SubscriptionsModule,
    PaymentsModule,
    PayoutsModule,
    EmailModule,
    AnalyticsModule,
    RecommendationsModule,
    ReferralsModule,
    TipsModule,
    AdminModule,
  ],
})
export class AppModule {}
