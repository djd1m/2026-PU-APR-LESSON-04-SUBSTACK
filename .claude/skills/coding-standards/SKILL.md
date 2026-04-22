---
name: coding-standards
description: >
  Coding standards skill for SubStack RU. Provides concrete patterns for NestJS,
  Prisma, Next.js App Router, and Resend email. Use when writing new code or
  reviewing existing code for adherence to project conventions.
  Trigger: "how should I write", "NestJS pattern", "Prisma pattern", "Next.js pattern".
version: "1.0"
maturity: production
---

# Coding Standards: SubStack RU

## NestJS Conventions

### Module Structure

Every feature is a NestJS module. One module per domain concept.

```typescript
// articles/articles.module.ts
@Module({
  imports: [PrismaModule, EmailModule],
  controllers: [ArticlesController],
  providers: [ArticlesService],
  exports: [ArticlesService], // export only what other modules need
})
export class ArticlesModule {}
```

### Controllers — HTTP Layer Only

Controllers handle HTTP concerns: routing, extracting params, calling services.
No business logic in controllers.

```typescript
// articles/articles.controller.ts
@Controller('articles')
@UseGuards(JwtAuthGuard)
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Post()
  async create(
    @Body() createArticleDto: CreateArticleDto,
    @CurrentUser() user: User,
  ): Promise<ArticleResponse> {
    return this.articlesService.create(createArticleDto, user.id);
  }

  @Get(':slug')
  async findOne(@Param('slug') slug: string): Promise<ArticleResponse> {
    return this.articlesService.findBySlug(slug);
  }
}
```

### Services — Business Logic

```typescript
// articles/articles.service.ts
@Injectable()
export class ArticlesService {
  private readonly logger = new Logger(ArticlesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async create(dto: CreateArticleDto, authorId: string): Promise<Article> {
    const slug = generateSlug(dto.title);

    return this.prisma.article.create({
      data: {
        ...dto,
        slug,
        authorId,
        status: ArticleStatus.DRAFT,
      },
    });
  }

  async publish(articleId: string, authorId: string): Promise<Article> {
    return this.prisma.$transaction(async (tx) => {
      const article = await tx.article.update({
        where: { id: articleId, authorId },
        data: { status: ArticleStatus.PUBLISHED, publishedAt: new Date() },
      });

      await tx.publicationEvent.create({
        data: { articleId, type: 'PUBLISHED' },
      });

      return article;
    });
  }
}
```

### Guards

```typescript
// auth/guards/jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) throw new UnauthorizedException();

    try {
      const payload = await this.jwtService.verifyAsync(token);
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
```

### DTOs with class-validator

```typescript
// articles/dto/create-article.dto.ts
import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';

export class CreateArticleDto {
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  title: string;

  @IsString()
  @MinLength(1)
  content: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  subtitle?: string;
}
```

## Prisma Patterns

### Transactions (multi-table writes)

```typescript
await this.prisma.$transaction(async (tx) => {
  const subscription = await tx.subscription.create({
    data: { userId, publicationId, tier: 'PAID', status: 'ACTIVE' },
  });
  await tx.subscriptionEvent.create({
    data: { subscriptionId: subscription.id, type: 'ACTIVATED', metadata: {} },
  });
  await tx.publication.update({
    where: { id: publicationId },
    data: { subscriberCount: { increment: 1 } },
  });
});
```

### Soft Delete

```typescript
// Soft delete — never hard delete user data
async removeArticle(id: string, authorId: string): Promise<void> {
  await this.prisma.article.update({
    where: { id, authorId },
    data: { deletedAt: new Date() },
  });
}

// Always filter out soft-deleted in queries
const articles = await this.prisma.article.findMany({
  where: { authorId, deletedAt: null },
});
```

### Pagination (cursor-based for feeds)

```typescript
async findPublishedArticles(cursor?: string, limit = 20): Promise<PaginatedArticles> {
  const take = limit + 1; // take one extra to determine if there's a next page

  const articles = await this.prisma.article.findMany({
    where: { status: 'PUBLISHED', deletedAt: null },
    take,
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { publishedAt: 'desc' },
    select: {
      id: true,
      title: true,
      subtitle: true,
      slug: true,
      publishedAt: true,
      author: { select: { id: true, displayName: true } },
    },
  });

  const hasNextPage = articles.length > limit;
  const items = hasNextPage ? articles.slice(0, -1) : articles;
  const nextCursor = hasNextPage ? items[items.length - 1].id : undefined;

  return { items, nextCursor, hasNextPage };
}
```

### Explicit Select (never leak sensitive fields)

```typescript
// Good — explicit select
const user = await this.prisma.user.findUnique({
  where: { id },
  select: {
    id: true,
    email: true,
    displayName: true,
    bio: true,
    avatarUrl: true,
    createdAt: true,
    // passwordHash: NOT included
  },
});
```

## Next.js App Router Patterns

### Server Component (public/SEO pages)

```typescript
// app/[authorSlug]/[articleSlug]/page.tsx
import { getArticleBySlug } from '@/lib/api/articles';
import { Metadata } from 'next';

interface Props {
  params: { authorSlug: string; articleSlug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = await getArticleBySlug(params.authorSlug, params.articleSlug);
  return {
    title: article.title,
    description: article.subtitle,
    openGraph: {
      title: article.title,
      description: article.subtitle,
      type: 'article',
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const article = await getArticleBySlug(params.authorSlug, params.articleSlug);
  return <ArticleView article={article} />;
}
```

### Client Component (dashboard/interactive)

```typescript
// components/editor/ArticleEditor.tsx
'use client';

import { useState } from 'react';

interface ArticleEditorProps {
  initialContent?: string;
  onSave: (content: string) => Promise<void>;
}

export function ArticleEditor({ initialContent = '', onSave }: ArticleEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(content);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* editor UI */}
    </div>
  );
}
```

## Resend Email Patterns

### Email Service (NestJS)

```typescript
// email/email.service.ts
@Injectable()
export class EmailService {
  private readonly resend: Resend;
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly configService: ConfigService) {
    this.resend = new Resend(configService.get('RESEND_API_KEY'));
  }

  async sendArticleNotification(
    subscriberEmail: string,
    article: ArticleEmailData,
  ): Promise<void> {
    try {
      await this.resend.emails.send({
        from: `${article.authorName} <noreply@substack.ru>`,
        to: subscriberEmail,
        subject: article.title,
        react: ArticleEmailTemplate({ article }),
        headers: {
          'List-Unsubscribe': `<https://substack.ru/unsubscribe?token=${article.unsubscribeToken}>`,
        },
      });
    } catch (error) {
      // Never log subscriberEmail — only log article ID for debugging
      this.logger.error('Failed to send article notification', {
        articleId: article.id,
        error: error instanceof Error ? error.message : 'unknown',
      });
      throw error; // Re-throw so BullMQ can retry
    }
  }
}
```

### Queue Email Sending (BullMQ)

```typescript
// Never send email inline with HTTP request — always queue
async publishArticle(articleId: string, authorId: string): Promise<void> {
  await this.prisma.$transaction(async (tx) => {
    await tx.article.update({ where: { id: articleId }, data: { status: 'PUBLISHED' } });
  });

  // Queue email notifications (async, non-blocking)
  await this.emailQueue.add('send-article-notifications', { articleId }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  });
}
```
