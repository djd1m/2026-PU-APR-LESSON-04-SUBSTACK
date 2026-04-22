import {
  Controller,
  ForbiddenException,
  Get,
  Logger,
  NotFoundException,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SubscriptionStatus } from '@prisma/client';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../auth/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';

interface AuthRequest extends Request {
  user: AuthenticatedUser;
}

@ApiTags('Subscriptions')
@UseGuards(JwtAuthGuard)
@Controller('api/author')
export class ExportController {
  private readonly logger = new Logger(ExportController.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /api/author/subscribers/export
   *
   * Returns a CSV file with all active subscribers for the author's publications.
   * Requires authentication. The requesting user must have role = author.
   *
   * CSV format:
   *   email,type,subscribed_at
   *   user@example.com,free,2026-01-15T10:00:00.000Z
   */
  @Get('subscribers/export')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Export subscribers as CSV',
    description:
      'Returns a downloadable CSV with email, subscription type, and subscription date ' +
      'for all active subscribers across all publications owned by the requesting author.',
  })
  @ApiResponse({
    status: 200,
    description: 'CSV file download',
    content: { 'text/csv': {} },
  })
  @ApiResponse({ status: 403, description: 'Only authors may export subscribers' })
  @ApiResponse({ status: 404, description: 'No publications found for this author' })
  async exportSubscribers(
    @Req() req: AuthRequest,
    @Res() res: Response,
  ): Promise<void> {
    const user = req.user;

    // Only users with author or admin role may export
    if (user.role !== 'author' && user.role !== 'admin') {
      throw new ForbiddenException('Only authors may export subscriber data');
    }

    // Find all publications owned by this author
    const publications = await this.prisma.publication.findMany({
      where: { author_id: user.id },
      select: { id: true, slug: true, name: true },
    });

    if (publications.length === 0) {
      throw new NotFoundException('No publications found for this author');
    }

    const publicationIds = publications.map((p) => p.id);

    // Query all active and grace-period subscribers for the author's publications
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        publication_id: { in: publicationIds },
        status: {
          in: [SubscriptionStatus.active, SubscriptionStatus.grace_period],
        },
      },
      include: {
        subscriber: {
          select: { email: true },
        },
      },
      orderBy: { started_at: 'asc' },
    });

    // Build CSV
    const csvHeader = 'email,type,subscribed_at';
    const csvRows = subscriptions.map((sub) => {
      const email = escapeCsvField(sub.subscriber.email);
      const type = escapeCsvField(sub.type);
      const subscribedAt = sub.started_at.toISOString();
      return `${email},${type},${subscribedAt}`;
    });

    const csvContent = [csvHeader, ...csvRows].join('\r\n');

    // Audit log — record the export action
    this.logger.log(
      `CSV export: author=${user.email} (id=${user.id}) exported ${subscriptions.length} subscriber(s) ` +
        `from ${publications.length} publication(s) at ${new Date().toISOString()}`,
    );

    // Filename: subscribers-YYYY-MM-DD.csv
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `subscribers-${dateStr}.csv`;

    res
      .setHeader('Content-Type', 'text/csv; charset=utf-8')
      .setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      .setHeader('Cache-Control', 'no-store')
      .status(200)
      .send('\uFEFF' + csvContent); // BOM for correct UTF-8 display in Excel/Sheets
  }
}

/**
 * Wrap a CSV field in double-quotes if it contains commas, quotes, or newlines.
 * Escapes internal double-quotes by doubling them (RFC 4180).
 */
function escapeCsvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
