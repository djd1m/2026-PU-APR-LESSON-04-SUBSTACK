import { Module, forwardRef } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

/**
 * PaymentsModule — handles payment processor webhooks and payment session creation.
 *
 * Circular dependency resolution:
 *   PaymentsModule  → imports SubscriptionsModule (for SubscriptionsService in PaymentsController)
 *   SubscriptionsModule → imports PaymentsModule  (for PaymentsService in SubscriptionsService)
 *
 * Both sides use forwardRef() so NestJS can resolve instances lazily at runtime.
 * PaymentsService is exported so SubscriptionsModule can inject it directly.
 */
@Module({
  imports: [forwardRef(() => SubscriptionsModule)],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
