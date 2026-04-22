# Coding Style — SubStack RU

## TypeScript

- **Strict mode:** `"strict": true` in tsconfig. No exceptions.
- **No `any`** in production code. Use `unknown` for external data, then narrow with guards.
- **`as` casting:** Avoid. If required, add inline comment explaining why it's safe.
- **Return types:** Explicitly declare on all public class methods and exported functions.
- **Union types** preferred over `enum` for string literals.
- **`readonly`** on properties that should not be mutated after construction.
- **Null handling:** Use `??` (nullish coalescing), not `||` for defaults. Use optional chaining `?.`.

```typescript
// Good
function getAuthorName(author: Author): string {
  return author.displayName ?? author.email;
}

// Bad
function getAuthorName(author: any) {
  return author.displayName || author.email;
}
```

## NestJS Module Structure

Each feature module follows this layout:
```
src/
  [module-name]/
    [module-name].module.ts       — Module definition, imports, providers
    [module-name].controller.ts   — HTTP handlers (thin, delegates to service)
    [module-name].service.ts      — Business logic
    [module-name].guard.ts        — Auth/permission guards (if needed)
    dto/
      create-[entity].dto.ts      — Input validation DTOs
      update-[entity].dto.ts
    entities/
      [entity].entity.ts          — TypeScript types mirroring Prisma models
```

**Controllers:** HTTP layer only. No business logic. Call service methods and return results.

**Services:** All business logic. Injectable. Depend on PrismaService, other services via DI.

**Guards:** Implement `CanActivate`. Return `boolean | Promise<boolean>`. Use `@UseGuards()`.

## Prisma Patterns

**Transactions for multi-table writes:**
```typescript
await this.prisma.$transaction(async (tx) => {
  const subscription = await tx.subscription.create({ data: { ... } });
  await tx.subscriptionEvent.create({ data: { subscriptionId: subscription.id, ... } });
});
```

**Soft delete:** Use `deletedAt` field. Never use hard delete for user data.
```typescript
await this.prisma.article.update({
  where: { id },
  data: { deletedAt: new Date() },
});
```

**Pagination (cursor-based for feeds):**
```typescript
const articles = await this.prisma.article.findMany({
  take: limit + 1,
  cursor: cursor ? { id: cursor } : undefined,
  orderBy: { publishedAt: 'desc' },
});
```

**Select explicitly when returning to client:**
```typescript
const author = await this.prisma.user.findUnique({
  where: { id },
  select: { id: true, displayName: true, bio: true }, // never return passwordHash
});
```

## Next.js Patterns

**App Router only.** No Pages Router.

**Server Components** for:
- Public article pages (SEO, initial load performance)
- Author profile pages
- Landing pages

**Client Components** (`'use client'`) for:
- Article editor
- Dashboard with real-time updates
- Payment forms
- Any component using `useState`, `useEffect`, event handlers

**Data fetching:**
```typescript
// Server Component — fetch directly
async function ArticlePage({ params }: { params: { slug: string } }) {
  const article = await getArticle(params.slug); // server-side fetch
  return <ArticleView article={article} />;
}
```

**Yandex SEO:** All public pages export metadata:
```typescript
export const metadata: Metadata = {
  title: '...',
  description: '...',
  openGraph: { ... },
};
```

## Resend Email Patterns

```typescript
// Always wrap in try/catch
try {
  await resend.emails.send({
    from: 'noreply@yourdomain.ru',
    to: subscriber.email,
    subject: 'Новая статья: ' + article.title,
    react: ArticleEmailTemplate({ article }),
  });
} catch (error) {
  // Log error WITHOUT the email address
  this.logger.error('Failed to send article email', { articleId: article.id });
}
```

## Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Files | `kebab-case` | `article-editor.service.ts` |
| Classes | `PascalCase` | `ArticleEditorService` |
| Functions/methods | `camelCase` | `publishArticle()` |
| Variables | `camelCase` | `authorProfile` |
| Constants | `UPPER_SNAKE_CASE` | `MAX_ARTICLE_LENGTH` |
| Interfaces | `PascalCase`, no `I` prefix | `ArticlePayload` |
| Types | `PascalCase` | `SubscriptionStatus` |
| Enums | `PascalCase` | `PaymentProvider` |
| CSS classes | `kebab-case` (Tailwind utilities) | `text-gray-700` |

## Exports

- **Named exports** preferred over default exports (improves refactoring, search).
- Exception: Next.js page components use default exports (framework requirement).

## Frontend: Tailwind CSS

- Use Tailwind utility classes directly in JSX.
- No inline `style` props except for truly dynamic values (e.g., calculated widths).
- Extract repeated class combinations to a component, not to a custom CSS class.
- Dark mode via `dark:` prefix if supported.

## Zod (Validation)

Use Zod for validating data at system boundaries (API responses, external webhooks, env vars):
```typescript
const PaymentWebhookSchema = z.object({
  TransactionId: z.number(),
  Amount: z.number().positive(),
  Status: z.enum(['Completed', 'Declined', 'Cancelled']),
});

const payload = PaymentWebhookSchema.parse(rawBody);
```
