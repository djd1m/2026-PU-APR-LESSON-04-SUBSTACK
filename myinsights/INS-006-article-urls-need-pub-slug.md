# [INS-006] Article URLs need publication slug — not available from articles API

**Date:** 2026-04-29
**Status:** Active
**Severity:** Medium
**Tags:** `frontend`, `api`, `routing`, `articles`
**Hits:** 1

## Error Signatures
```
Cannot navigate to article
Article links broken
Missing publication slug in URL
```

## Symptoms
Dashboard articles list shows articles but clicking them doesn't navigate to the published page. Links are broken because the URL `/:pubSlug/:articleSlug` requires the publication slug, but the articles API endpoint `GET /publications/:slug/articles` doesn't include `publicationSlug` in each article object.

## Root Cause
Articles are loaded per-publication via `GET /publications/:slug/articles`. The response contains article data but NOT the publication slug (it's in the URL, not the response body). When building the article's public URL in the frontend, we need `publicationSlug` which isn't available in the article object.

## Solution
Enrich article objects on the frontend side: when iterating over publications to load their articles, attach `publicationSlug` and `publicationName` to each article before merging into the combined list.

```typescript
for (const pub of pubs) {
  const items = await loadArticles(pub.slug)
  for (const item of items) {
    item.publicationSlug = pub.slug  // attach!
    item.publicationName = pub.name
  }
  allArticles.push(...items)
}
```

## Prevention
- When designing API responses, consider what the consumer needs for navigation
- Alternative: add `publication` relation to article list endpoints (backend include)
- Consider a dedicated "author's articles" endpoint that includes publication info
