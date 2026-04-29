# [INS-007] Subscribe endpoint receives slug but expects UUID

**Date:** 2026-04-29
**Status:** Active
**Severity:** Critical
**Tags:** `api`, `subscriptions`, `prisma`, `routing`
**Hits:** 1

## Error Signatures
```
500 Internal Server Error
Inconsistent column data: Error creating UUID, invalid character
expected an optional prefix of `urn:uuid:` followed by [0-9a-fA-F-]
```

## Symptoms
POST /api/publications/ai-discounts/subscribe returns 500. Prisma throws "Error creating UUID, invalid character" because slug string "ai-discounts" is passed as UUID to `findUnique({ where: { id: ... } })`.

## Root Cause
Controller receives `:pubId` from URL path. Frontend passes the publication slug (from page URL), not UUID. Service calls `prisma.publication.findUnique({ where: { id: pubId } })` — Prisma tries to parse slug as UUID and fails.

## Solution
Detect if parameter is UUID or slug, use appropriate lookup:
```typescript
const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(param);
const publication = await prisma.publication.findUnique({
  where: isUuid ? { id: param } : { slug: param },
});
```

## Prevention
- Name route params clearly: `:pubSlug` vs `:pubId` to signal expected type
- Use ParseUUIDPipe in NestJS for UUID-only params, skip for slug params
- Consider always using slug in public APIs (more user-friendly URLs)
