import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PayoutsController } from './payouts.controller';
import { PayoutsService } from './payouts.service';

/**
 * PayoutsModule — author payout management.
 *
 * Responsibilities:
 *   - Tracking pending author balances derived from Payments and Tips.
 *   - Creating Payout records when the minimum threshold (100 000 kopecks) is met.
 *   - Storing author bank details.
 *   - Running a monthly cron job to auto-process payouts.
 *
 * PrismaService is provided globally via PrismaModule (@Global) and does not
 * need to be imported here.
 *
 * ScheduleModule.forRoot() enables the @Cron decorator in PayoutsService.
 * If ScheduleModule is already registered in AppModule, this import is harmless.
 */
@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [PayoutsController],
  providers: [PayoutsService],
  exports: [PayoutsService],
})
export class PayoutsModule {}
