import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
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
import { Public } from '../../auth/decorators/public.decorator';
import { AuthenticatedUser } from '../../auth/jwt.strategy';
import { ArticlesService } from './articles.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';

// Typed request helper
interface AuthRequest extends Request {
  user: AuthenticatedUser;
}

// ─── Schedule body DTO ────────────────────────────────────────────────────────

import { IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class ScheduleArticleDto {
  @ApiProperty({
    description: 'ISO 8601 date-time string for scheduled publication',
    example: '2026-05-01T10:00:00.000Z',
  })
  @IsDateString()
  scheduledAt: string;
}

// ─── Controller ───────────────────────────────────────────────────────────────

@ApiTags('Articles')
@UseGuards(JwtAuthGuard)
@Controller()
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  // ── POST /api/publications/:pubId/articles ───────────────────────────────────

  @Post('api/publications/:pubId/articles')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiTags('Publications')
  @ApiOperation({ summary: 'Create a draft article in a publication' })
  @ApiParam({ name: 'pubId', description: 'Publication UUID' })
  @ApiResponse({ status: 201, description: 'Article created' })
  @ApiResponse({ status: 403, description: 'Not the publication owner' })
  @ApiResponse({ status: 404, description: 'Publication not found' })
  async create(
    @Param('pubId', ParseUUIDPipe) pubId: string,
    @Body() dto: CreateArticleDto,
    @Req() req: AuthRequest,
  ) {
    return this.articlesService.create(pubId, req.user.id, dto);
  }

  // ── GET /api/publications/:slug/articles ─────────────────────────────────────

  @Public()
  @Get('api/publications/:slug/articles')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List articles for a publication (paginated). Owners see drafts too.' })
  @ApiParam({ name: 'slug', description: 'Publication slug' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: 'Paginated article list' })
  @ApiResponse({ status: 404, description: 'Publication not found' })
  async list(
    @Param('slug') slug: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Req() req: AuthRequest,
  ) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 20);
    // If user is authenticated, check if they own this publication
    const userId = req.user?.id;
    const isOwner = userId
      ? await this.articlesService.isPublicationOwner(slug, userId)
      : false;
    return this.articlesService.findByPublicationSlug(slug, pageNum, limitNum, isOwner);
  }

  // ── GET /api/publications/:slug/articles/:articleSlug ────────────────────────

  @Public()
  @Get('api/publications/:slug/articles/:articleSlug')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a single published article (paywall applies to paid articles)' })
  @ApiParam({ name: 'slug', description: 'Publication slug' })
  @ApiParam({ name: 'articleSlug', description: 'Article slug' })
  @ApiResponse({ status: 200, description: 'Article data (paid content may be truncated)' })
  @ApiResponse({ status: 404, description: 'Article or publication not found' })
  async findOne(
    @Param('slug') slug: string,
    @Param('articleSlug') articleSlug: string,
  ) {
    return this.articlesService.findBySlug(slug, articleSlug);
  }

  // ── PATCH /api/articles/:id ──────────────────────────────────────────────────

  @Patch('api/articles/:id')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an article (owner only)' })
  @ApiParam({ name: 'id', description: 'Article UUID' })
  @ApiResponse({ status: 200, description: 'Updated article' })
  @ApiResponse({ status: 403, description: 'Not the article owner' })
  @ApiResponse({ status: 404, description: 'Article not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateArticleDto,
    @Req() req: AuthRequest,
  ) {
    return this.articlesService.update(id, req.user.id, dto);
  }

  // ── POST /api/articles/:id/publish ──────────────────────────────────────────

  @Post('api/articles/:id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish an article immediately (owner only)' })
  @ApiParam({ name: 'id', description: 'Article UUID' })
  @ApiResponse({ status: 200, description: 'Article published' })
  @ApiResponse({ status: 403, description: 'Not the article owner' })
  @ApiResponse({ status: 404, description: 'Article not found' })
  async publish(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthRequest,
  ) {
    return this.articlesService.publish(id, req.user.id);
  }

  // ── POST /api/articles/:id/schedule ─────────────────────────────────────────

  @Post('api/articles/:id/schedule')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Schedule an article for future publication (owner only)' })
  @ApiParam({ name: 'id', description: 'Article UUID' })
  @ApiResponse({ status: 200, description: 'Article scheduled' })
  @ApiResponse({ status: 403, description: 'Not the article owner' })
  @ApiResponse({ status: 404, description: 'Article not found' })
  async schedule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ScheduleArticleDto,
    @Req() req: AuthRequest,
  ) {
    return this.articlesService.schedule(id, req.user.id, new Date(dto.scheduledAt));
  }

  // ── DELETE /api/articles/:id ─────────────────────────────────────────────────

  @Delete('api/articles/:id')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an article (owner only)' })
  @ApiParam({ name: 'id', description: 'Article UUID' })
  @ApiResponse({ status: 200, description: 'Article deleted' })
  @ApiResponse({ status: 403, description: 'Not the article owner' })
  @ApiResponse({ status: 404, description: 'Article not found' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthRequest,
  ) {
    return this.articlesService.delete(id, req.user.id);
  }
}
