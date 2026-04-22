import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../auth/jwt.strategy';
import { AnalyticsService } from './analytics.service';

interface AuthRequest extends Request {
  user: AuthenticatedUser;
}

@ApiTags('Analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('api/author/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // ── GET /api/author/analytics/overview ───────────────────────────────────

  @Get('overview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get analytics overview for the authenticated author' })
  @ApiResponse({ status: 200, description: 'Analytics overview returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Author not found' })
  async getOverview(@Req() req: AuthRequest) {
    return this.analyticsService.getOverview(req.user.id);
  }

  // ── GET /api/author/analytics/articles/:id ───────────────────────────────

  @Get('articles/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get email delivery analytics for a specific article' })
  @ApiParam({ name: 'id', description: 'Article UUID' })
  @ApiResponse({ status: 200, description: 'Article analytics returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Article does not belong to this author' })
  @ApiResponse({ status: 404, description: 'Article not found' })
  async getArticleAnalytics(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthRequest,
  ) {
    return this.analyticsService.getArticleAnalytics(id, req.user.id);
  }

  // ── GET /api/author/analytics/revenue?from=&to= ──────────────────────────

  @Get('revenue')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get revenue analytics for the authenticated author' })
  @ApiQuery({
    name: 'from',
    required: true,
    description: 'Start date (ISO 8601)',
    example: '2026-01-01',
  })
  @ApiQuery({
    name: 'to',
    required: true,
    description: 'End date (ISO 8601)',
    example: '2026-04-22',
  })
  @ApiResponse({ status: 200, description: 'Revenue analytics returned' })
  @ApiResponse({ status: 400, description: 'Invalid or missing date parameters' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Author not found' })
  async getRevenueAnalytics(
    @Query('from') from: string,
    @Query('to') to: string,
    @Req() req: AuthRequest,
  ) {
    if (!from || !to) {
      throw new BadRequestException('Query parameters "from" and "to" are required');
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      throw new BadRequestException('Invalid date format — use ISO 8601 (e.g. 2026-01-01)');
    }

    if (fromDate > toDate) {
      throw new BadRequestException('"from" must not be after "to"');
    }

    // Include the full end day
    toDate.setHours(23, 59, 59, 999);

    return this.analyticsService.getRevenueAnalytics(req.user.id, fromDate, toDate);
  }
}
