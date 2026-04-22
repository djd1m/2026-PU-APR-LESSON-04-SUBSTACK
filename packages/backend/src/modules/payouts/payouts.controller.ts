import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../auth/jwt.strategy';
import { BankDetailsDto } from './dto/bank-details.dto';
import { PayoutsService } from './payouts.service';

interface AuthRequest extends Request {
  user: AuthenticatedUser;
}

@ApiTags('Payouts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('api/author')
export class PayoutsController {
  constructor(private readonly payoutsService: PayoutsService) {}

  // ── GET /api/author/payouts ──────────────────────────────────────────────

  @Get('payouts')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get payout history for the authenticated author' })
  @ApiResponse({ status: 200, description: 'List of payout records returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Author not found' })
  async getPayoutHistory(@Req() req: AuthRequest) {
    return this.payoutsService.getPayoutHistory(req.user.id);
  }

  // ── GET /api/author/revenue ──────────────────────────────────────────────

  @Get('revenue')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get full revenue breakdown for the authenticated author',
    description:
      'Returns lifetime revenue, fees, net earnings, pending unpaid balance, and payout history. All amounts in kopecks.',
  })
  @ApiResponse({ status: 200, description: 'Revenue breakdown returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Author not found' })
  async getRevenue(@Req() req: AuthRequest) {
    return this.payoutsService.getRevenueBreakdown(req.user.id);
  }

  // ── PATCH /api/author/payouts/bank-details ───────────────────────────────

  @Patch('payouts/bank-details')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save or update bank account details for payouts' })
  @ApiResponse({ status: 200, description: 'Bank details saved' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Author not found' })
  async saveBankDetails(
    @Body() dto: BankDetailsDto,
    @Req() req: AuthRequest,
  ) {
    return this.payoutsService.saveBankDetails(req.user.id, dto);
  }
}
