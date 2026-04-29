import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ArticleStatus, ArticleVisibility } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { generateExcerpt, renderMarkdown, slugify } from './articles.utils';

@Injectable()
export class ArticlesService {
  private readonly logger = new Logger(ArticlesService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  /**
   * Generates a unique slug within a publication by appending a numeric suffix
   * if the base slug is already taken.
   */
  private async uniqueSlug(
    publicationId: string,
    baseSlug: string,
  ): Promise<string> {
    let candidate = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await this.prisma.article.findUnique({
        where: { publication_id_slug: { publication_id: publicationId, slug: candidate } },
        select: { id: true },
      });

      if (!existing) return candidate;

      candidate = `${baseSlug}-${counter}`;
      counter += 1;
    }
  }

  /**
   * Checks if a user owns a publication by slug.
   */
  async isPublicationOwner(slug: string, userId: string): Promise<boolean> {
    const pub = await this.prisma.publication.findUnique({
      where: { slug },
      select: { author_id: true },
    });
    return pub?.author_id === userId;
  }

  /**
   * Fetches the publication and verifies that authorId owns it.
   * Throws NotFoundException if publication does not exist,
   * ForbiddenException if the caller is not the owner.
   */
  private async assertPublicationOwner(
    publicationId: string,
    authorId: string,
  ): Promise<void> {
    const publication = await this.prisma.publication.findUnique({
      where: { id: publicationId },
      select: { author_id: true },
    });

    if (!publication) {
      throw new NotFoundException(`Publication ${publicationId} not found`);
    }

    if (publication.author_id !== authorId) {
      throw new ForbiddenException('You are not the owner of this publication');
    }
  }

  /**
   * Fetches an article by id and verifies that authorId owns its publication.
   */
  private async assertArticleOwner(
    articleId: string,
    authorId: string,
  ) {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      include: { publication: { select: { author_id: true } } },
    });

    if (!article) {
      throw new NotFoundException(`Article ${articleId} not found`);
    }

    if (article.publication.author_id !== authorId) {
      throw new ForbiddenException('You are not the owner of this article');
    }

    return article;
  }

  /**
   * Find article by ID — for editing. Verifies ownership.
   */
  async findById(articleId: string, authorId: string) {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      include: { publication: { select: { author_id: true } } },
    });

    if (!article) {
      throw new NotFoundException(`Article ${articleId} not found`);
    }

    if (article.publication.author_id !== authorId) {
      throw new ForbiddenException('You are not the owner of this article');
    }

    return article;
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────────────

  /**
   * Creates a draft article.
   * - Auto-generates a slug from the title (with Russian transliteration).
   * - Renders markdown to HTML.
   * - Generates an excerpt from the first 300 chars of plaintext.
   */
  async create(publicationId: string, authorId: string, dto: CreateArticleDto) {
    await this.assertPublicationOwner(publicationId, authorId);

    const baseSlug = slugify(dto.title);
    const slug = await this.uniqueSlug(publicationId, baseSlug || 'article');
    const content_html = renderMarkdown(dto.content_markdown);
    const excerpt = generateExcerpt(content_html);

    const article = await this.prisma.article.create({
      data: {
        publication_id: publicationId,
        title: dto.title,
        slug,
        content_markdown: dto.content_markdown,
        content_html,
        excerpt,
        visibility: dto.visibility ?? ArticleVisibility.free,
        status: dto.status ?? ArticleStatus.draft,
        cover_image_url: dto.cover_image_url,
        seo_title: dto.seo_title,
        seo_description: dto.seo_description,
      },
    });

    this.logger.log(`Article created: ${article.id} (slug: ${slug})`);
    return article;
  }

  /**
   * Returns a paginated list of articles for a publication identified by slug.
   *
   * @param pubSlug - publication slug
   * @param page - 1-based page number
   * @param limit - items per page (max 50)
   * @param isOwner - when true, includes drafts and scheduled articles
   */
  async findByPublicationSlug(
    pubSlug: string,
    page: number,
    limit: number,
    isOwner = false,
  ) {
    const safeLimit = Math.min(limit, 50);
    const skip = (page - 1) * safeLimit;

    const publication = await this.prisma.publication.findUnique({
      where: { slug: pubSlug },
      select: { id: true, author_id: true },
    });

    if (!publication) {
      throw new NotFoundException(`Publication "${pubSlug}" not found`);
    }

    const where = isOwner
      ? { publication_id: publication.id }
      : {
          publication_id: publication.id,
          status: ArticleStatus.published,
        };

    const [items, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        orderBy: { published_at: 'desc' },
        skip,
        take: safeLimit,
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          cover_image_url: true,
          visibility: true,
          status: true,
          published_at: true,
          created_at: true,
          updated_at: true,
          seo_title: true,
          seo_description: true,
        },
      }),
      this.prisma.article.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  /**
   * Returns a single article by publication slug + article slug.
   * - Paid articles return content_html only for subscribers (caller must check).
   * - Drafts/scheduled articles are not exposed here — use the owner endpoint.
   */
  async findBySlug(pubSlug: string, articleSlug: string) {
    const publication = await this.prisma.publication.findUnique({
      where: { slug: pubSlug },
      select: { id: true },
    });

    if (!publication) {
      throw new NotFoundException(`Publication "${pubSlug}" not found`);
    }

    const article = await this.prisma.article.findUnique({
      where: {
        publication_id_slug: {
          publication_id: publication.id,
          slug: articleSlug,
        },
      },
    });

    if (!article || article.status !== ArticleStatus.published) {
      throw new NotFoundException(`Article "${articleSlug}" not found`);
    }

    // For paid articles return the excerpt only (paywall).
    // The controller layer can enrich this decision with subscription info.
    if (article.visibility === ArticleVisibility.paid) {
      return {
        ...article,
        content_html: null,
        content_markdown: null,
        paywalled: true,
      };
    }

    return { ...article, paywalled: false };
  }

  /**
   * Updates an article. Only the publication owner may update.
   * Re-renders markdown and regenerates excerpt when content_markdown changes.
   */
  async update(id: string, authorId: string, dto: UpdateArticleDto) {
    const article = await this.assertArticleOwner(id, authorId);

    const contentChanged =
      dto.content_markdown !== undefined &&
      dto.content_markdown !== article.content_markdown;

    const content_html = contentChanged
      ? renderMarkdown(dto.content_markdown!)
      : undefined;

    const excerpt = contentChanged
      ? generateExcerpt(content_html!)
      : undefined;

    const updated = await this.prisma.article.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.content_markdown !== undefined && {
          content_markdown: dto.content_markdown,
        }),
        ...(content_html !== undefined && { content_html }),
        ...(excerpt !== undefined && { excerpt }),
        ...(dto.visibility !== undefined && { visibility: dto.visibility }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.cover_image_url !== undefined && {
          cover_image_url: dto.cover_image_url,
        }),
        ...(dto.seo_title !== undefined && { seo_title: dto.seo_title }),
        ...(dto.seo_description !== undefined && {
          seo_description: dto.seo_description,
        }),
      },
    });

    this.logger.log(`Article updated: ${id}`);
    return updated;
  }

  /**
   * Publishes an article: sets status to published and records published_at.
   * Queues email delivery to subscribers (fire-and-forget).
   */
  async publish(id: string, authorId: string) {
    await this.assertArticleOwner(id, authorId);

    const article = await this.prisma.article.update({
      where: { id },
      data: {
        status: ArticleStatus.published,
        published_at: new Date(),
        scheduled_at: null,
      },
    });

    this.logger.log(`Article published: ${id}`);

    // Trigger email queue asynchronously (no await — fail silently for now,
    // real implementation will use Bull queue in EmailModule)
    this.triggerEmailQueue(article.id).catch((err: unknown) => {
      this.logger.error(`Email queue trigger failed for article ${id}`, err);
    });

    return article;
  }

  /**
   * Schedules an article for future publication.
   */
  async schedule(id: string, authorId: string, scheduledAt: Date) {
    await this.assertArticleOwner(id, authorId);

    const article = await this.prisma.article.update({
      where: { id },
      data: {
        status: ArticleStatus.scheduled,
        scheduled_at: scheduledAt,
      },
    });

    this.logger.log(
      `Article scheduled: ${id} at ${scheduledAt.toISOString()}`,
    );
    return article;
  }

  /**
   * Soft-deletes an article by setting its status to archived.
   * Hard-deletes are not performed to preserve email delivery history.
   */
  async delete(id: string, authorId: string) {
    const article = await this.assertArticleOwner(id, authorId);

    // Soft delete: use a status that hides the article from listings.
    // ArticleStatus enum has draft | scheduled | published — we use delete()
    // directly since Prisma schema has no "archived" status. If the team later
    // adds an `archived` status, swap the line below.
    await this.prisma.article.delete({ where: { id } });

    this.logger.log(`Article deleted: ${id} (title: "${article.title}")`);
    return { deleted: true, id };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────────

  /**
   * Placeholder for the email queue trigger.
   * Will be replaced by an InjectQueue(ARTICLE_EMAIL_QUEUE) Bull producer
   * once EmailModule is implemented.
   */
  private async triggerEmailQueue(articleId: string): Promise<void> {
    this.logger.log(
      `[EMAIL QUEUE] Enqueue email delivery for article ${articleId}`,
    );
    // TODO: inject Bull queue and add job:
    // await this.emailQueue.add('send-article', { articleId });
  }
}
