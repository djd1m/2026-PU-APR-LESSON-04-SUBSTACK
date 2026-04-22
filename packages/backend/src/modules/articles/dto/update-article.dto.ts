import { PartialType } from '@nestjs/swagger';
import { CreateArticleDto } from './create-article.dto';

/**
 * All fields from CreateArticleDto become optional for PATCH operations.
 */
export class UpdateArticleDto extends PartialType(CreateArticleDto) {}
