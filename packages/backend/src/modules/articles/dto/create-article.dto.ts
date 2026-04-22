import {
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ArticleStatus, ArticleVisibility } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateArticleDto {
  @ApiProperty({ description: 'Article title', minLength: 1, maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiProperty({ description: 'Article body in Markdown format', minLength: 1 })
  @IsString()
  @MinLength(1)
  content_markdown: string;

  @ApiPropertyOptional({
    description: 'Who can read this article',
    enum: ArticleVisibility,
    default: ArticleVisibility.free,
  })
  @IsOptional()
  @IsEnum(ArticleVisibility)
  visibility?: ArticleVisibility = ArticleVisibility.free;

  @ApiPropertyOptional({
    description: 'Initial publication status',
    enum: ArticleStatus,
    default: ArticleStatus.draft,
  })
  @IsOptional()
  @IsEnum(ArticleStatus)
  status?: ArticleStatus = ArticleStatus.draft;

  @ApiPropertyOptional({ description: 'Cover image URL' })
  @IsOptional()
  @IsUrl()
  cover_image_url?: string;

  @ApiPropertyOptional({ description: 'SEO title (overrides article title in meta)' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  seo_title?: string;

  @ApiPropertyOptional({ description: 'SEO meta description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  seo_description?: string;
}
