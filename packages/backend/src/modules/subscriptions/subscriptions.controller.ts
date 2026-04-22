import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { AuthenticatedUser } from '../../auth/jwt.strategy';
import { CreatePaidSubscriptionDto } from './dto/create-paid-subscription.dto';
import { SubscriptionsService } from './subscriptions.service';

interface AuthRequest extends Request {
  user: AuthenticatedUser;
}

/**
 * SubscriptionsController
 *
 * All routes require a valid JWT (authentication).
 * No role restriction is applied — any authenticated user may subscribe.
 */
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  /**
   * POST /api/publications/:pubId/subscribe
   * Create a free subscription for the authenticated user.
   */
  @Post('api/publications/:pubId/subscribe')
  subscribeFree(
    @Param('pubId') pubId: string,
    @Request() req: AuthRequest,
  ) {
    return this.subscriptionsService.subscribeFree(req.user.id, pubId);
  }

  /**
   * POST /api/publications/:pubId/subscribe/paid
   * Initiate a paid subscription. Returns { paymentUrl } for the chosen processor.
   */
  @Post('api/publications/:pubId/subscribe/paid')
  subscribePaid(
    @Param('pubId') pubId: string,
    @Request() req: AuthRequest,
    @Body() dto: CreatePaidSubscriptionDto,
  ) {
    return this.subscriptionsService.subscribePaid(
      req.user.id,
      pubId,
      dto.processor,
    );
  }

  /**
   * DELETE /api/subscriptions/:id
   * Cancel a subscription. Only the subscriber who owns it may cancel.
   * Access is retained until the current period ends (expires_at).
   */
  @Delete('api/subscriptions/:id')
  cancelSubscription(
    @Param('id') id: string,
    @Request() req: AuthRequest,
  ) {
    return this.subscriptionsService.cancelSubscription(id, req.user.id);
  }

  /**
   * GET /api/me/subscriptions
   * Return all subscriptions for the currently authenticated user.
   */
  @Get('api/me/subscriptions')
  getMySubscriptions(@Request() req: AuthRequest) {
    return this.subscriptionsService.getUserSubscriptions(req.user.id);
  }
}
