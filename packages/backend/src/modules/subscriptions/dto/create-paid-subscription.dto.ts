import { IsEnum } from 'class-validator';
import { PaymentProcessor } from '@prisma/client';

/**
 * DTO for initiating a paid subscription to a publication.
 * The publicationId is taken from the route param.
 */
export class CreatePaidSubscriptionDto {
  @IsEnum(PaymentProcessor, {
    message: 'processor must be one of: cloudpayments, sbp, yookassa',
  })
  processor: PaymentProcessor;
}
