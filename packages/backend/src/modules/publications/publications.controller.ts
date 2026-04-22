import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../../auth/decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../../auth/guards/jwt-auth.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { AuthenticatedUser } from '../../auth/jwt.strategy';
import { CreatePublicationDto } from './dto/create-publication.dto';
import { UpdatePublicationDto } from './dto/update-publication.dto';
import { PublicationsService } from './publications.service';
import { SetMetadata } from '@nestjs/common';
import { IsInt, Min } from 'class-validator';

// Inline decorator to avoid circular imports — matches IS_PUBLIC_KEY from jwt-auth.guard
const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// Minimal DTO for the paid-tier endpoint
class EnablePaidTierDto {
  @IsInt()
  @Min(1)
  price_monthly: number;
}

interface AuthRequest extends Request {
  user: AuthenticatedUser;
}

@Controller('api/publications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PublicationsController {
  constructor(private readonly publicationsService: PublicationsService) {}

  /**
   * POST /api/publications
   * Create a new publication. Requires authentication and author role.
   */
  @Post()
  @Roles(UserRole.author, UserRole.admin)
  create(@Request() req: AuthRequest, @Body() dto: CreatePublicationDto) {
    return this.publicationsService.create(req.user.id, dto);
  }

  /**
   * GET /api/publications/:slug
   * Fetch a publication by its slug. Public — no auth required.
   */
  @Get(':slug')
  @Public()
  findBySlug(@Param('slug') slug: string) {
    return this.publicationsService.findBySlug(slug);
  }

  /**
   * PATCH /api/publications/:id
   * Update publication metadata. Owner only.
   */
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Request() req: AuthRequest,
    @Body() dto: UpdatePublicationDto,
  ) {
    return this.publicationsService.update(id, req.user.id, dto);
  }

  /**
   * PATCH /api/publications/:id/paid
   * Enable (or update) paid subscription tier. Owner only.
   */
  @Patch(':id/paid')
  enablePaidTier(
    @Param('id') id: string,
    @Request() req: AuthRequest,
    @Body() dto: EnablePaidTierDto,
  ) {
    return this.publicationsService.enablePaidTier(
      id,
      req.user.id,
      dto.price_monthly,
    );
  }
}
