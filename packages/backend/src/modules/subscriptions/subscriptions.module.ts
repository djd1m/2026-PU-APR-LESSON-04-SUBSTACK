import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ExportController } from './export.controller';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { PaymentsModule } from '../payments/payments.module';

/**
 * SubscriptionsModule — manages subscription lifecycle and cron-based expiry.
 *
 * Dependency graph:
 *   SubscriptionsModule imports PaymentsModule (for PaymentsService)
 *   PaymentsModule imports SubscriptionsModule (for SubscriptionsService in PaymentsController)
 *
 * forwardRef on PaymentsModule breaks the circular reference at module
 * registration time. NestJS resolves actual instances at runtime.
 *
 * ScheduleModule.forRoot() enables the @Cron decorator in
 * SubscriptionsService.checkGracePeriods(). If ScheduleModule is already
 * registered globally in AppModule, this import is harmless.
 */
@Module({
  imports: [
    ScheduleModule.forRoot(),
    forwardRef(() => PaymentsModule),
  ],
  controllers: [ExportController, SubscriptionsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
