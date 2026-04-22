# [INS-002] Frontend editor uses wrong API endpoint path

**Date:** 2026-04-22
**Status:** Active
**Severity:** Critical
**Tags:** `frontend`, `api`, `editor`, `articles`
**Hits:** 1

## Error Signatures
```
404 Not Found
/author/articles
Cannot POST /api/author/articles
Ошибка сохранения
```

## Symptoms
Clicking "Сохранить черновик" or "Опубликовать" in the editor shows "Ошибка сохранения". Browser console shows 404 on `POST /api/author/articles`.

## Diagnostic Steps
1. Checked browser Network tab — 404 on POST
2. Compared frontend endpoint with backend controller routes
3. Found mismatch: frontend sends to `/author/articles`, backend expects `/publications/:pubId/articles`

## Root Cause
Three mismatches between frontend editor and backend API:
1. **Wrong path:** `/author/articles` vs `/publications/:pubId/articles` — backend requires publication ID
2. **Wrong field name:** `content` vs `content_markdown` — DTO validation rejects
3. **Missing publication selection:** Editor didn't load author's publications, had no `pubId` to send

## Solution
1. Editor now loads publications via `GET /api/publications/my` on mount
2. Sends to `POST /api/publications/${selectedPubId}/articles`
3. Field renamed from `content` to `content_markdown`
4. Added `GET /api/publications/my` backend endpoint (was missing)

## Prevention
- Always cross-reference frontend API calls with backend controller decorators
- Use Swagger/OpenAPI as contract between frontend and backend
- Add API client types generated from backend (e.g. via openapi-typescript)
