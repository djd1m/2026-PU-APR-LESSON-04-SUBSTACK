import { IsUUID } from 'class-validator';

/**
 * DTO for subscribing to a publication for free.
 * The publicationId is taken from the route param, not the body,
 * but this DTO is kept for potential future body fields.
 */
export class CreateFreeSubscriptionDto {
  @IsUUID()
  publicationId: string;
}
