import { Module } from '@nestjs/common';
import { ArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';

/**
 * ArticlesModule — manages article creation, listing, updating,
 * publishing, scheduling, and deletion for publications.
 *
 * PrismaService is globally provided via PrismaModule (@Global),
 * so no explicit import is required here.
 */
@Module({
  imports: [],
  controllers: [ArticlesController],
  providers: [ArticlesService],
  exports: [ArticlesService],
})
export class ArticlesModule {}
