# Toolkit Harvest Report: SubStack RU

**Date:** 2026-04-29 | **Mode:** Quick | **Project:** SubStack RU (newsletter platform)
**Stack:** Next.js 15 + NestJS 10 + PostgreSQL 16 + Prisma + Redis + Docker

---

## Extracted Artifacts (7)

### Pattern 1: Zustand Persist Hydration Guard

**Category:** Pattern | **Maturity:** Alpha | **Reusability:** High
**Source:** `packages/frontend/src/lib/auth.ts` + `dashboard/layout.tsx`

**Problem:** Zustand persist middleware loads state from localStorage asynchronously. On first render, state is default (e.g., `isAuthenticated: false`). Components that redirect based on auth state fire before hydration completes, causing flash redirects to login.

**Solution:**
```typescript
// In store definition:
_hasHydrated: false,
// ...
onRehydrateStorage: () => (state) => {
  if (state) state._hasHydrated = true
}

// In protected layout:
const { isAuthenticated, _hasHydrated } = useAuth()
useEffect(() => {
  if (_hasHydrated && !isAuthenticated) router.replace('/auth/login')
}, [isAuthenticated, _hasHydrated])
if (!_hasHydrated) return <Loading />
```

**Generalized:** Any React app using Zustand persist + protected routes.

---

### Pattern 2: API Client with Auto-Refresh on 401

**Category:** Pattern | **Maturity:** Alpha | **Reusability:** High
**Source:** `packages/frontend/src/lib/api.ts`

**Problem:** JWT access tokens expire. All API calls fail silently with 401. User sees generic errors, gets stuck.

**Solution:**
```typescript
// On 401, try refresh once, then retry original request:
if (response.status === 401 && !skipAuth && !_isRetry) {
  const newToken = await tryRefreshToken()
  if (newToken) return fetchAPI(path, { ...options, _isRetry: true })
  // Refresh failed — redirect to login
  clearAuthState()
  window.location.href = '/auth/login'
}
```

**Key details:**
- `_isRetry` flag prevents infinite loops
- Token stored in both cookie and localStorage (dual read)
- `tryRefreshToken()` calls `POST /auth/refresh` with credentials

**Generalized:** Any SPA with JWT access + refresh token flow.

---

### Pattern 3: NestJS CORS Dynamic Origin (Dev/Prod)

**Category:** Snippet | **Maturity:** Alpha | **Reusability:** High
**Source:** `packages/backend/src/main.ts`

**Problem:** Hardcoded CORS origins fail when accessing dev server from external IP. `localhost` in CORS whitelist doesn't match `http://212.192.0.33:3011`.

**Solution:**
```typescript
app.enableCors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true) // curl, mobile
    if (nodeEnv === 'development') return callback(null, true) // allow all in dev
    if (whitelist.includes(origin)) return callback(null, true)
    callback(new Error('Not allowed by CORS'))
  },
  credentials: true,
})
```

**Generalized:** Any NestJS app accessed from external IPs during dev.

---

### Pattern 4: Payment Webhook HMAC Verification (Multi-Provider)

**Category:** Pattern | **Maturity:** Alpha | **Reusability:** Medium
**Source:** `packages/backend/src/modules/payments/`

**Problem:** Payment webhooks must be verified before processing. Different providers use different HMAC algorithms and header names.

**Solution:**
```
CloudPayments: Content-HMAC header, HMAC-SHA256, Base64 encoded
YooKassa: X-YooKassa-Signature header, HMAC-SHA256, hex encoded
SBP: X-SBP-Signature header, HMAC-SHA256, hex encoded

Pattern: verify signature FIRST → parse payload → process → return 200 always
Idempotency: check processor_tx_id for duplicates before creating payment
```

**Generalized:** Any app with multiple payment providers needing webhook verification.

---

### Pattern 5: Cyrillic-to-Latin Slug Transliteration

**Category:** Snippet | **Maturity:** Alpha | **Reusability:** High
**Source:** `packages/backend/src/modules/articles/articles.utils.ts`

**Problem:** Russian text needs URL-safe slugs. Standard `slugify` libraries often skip Cyrillic.

**Solution:** 66-char transliteration map (а→a, б→b, ..., ё→yo, ж→zh, etc.) + lowercase + replace non-alnum with hyphens + dedup hyphens + trim.

**Generalized:** Any Russian-language app needing URL slugs from Cyrillic text.

---

### Pattern 6: NestJS @Public() + Optional Auth on Same Route

**Category:** Pattern | **Maturity:** Alpha | **Reusability:** Medium
**Source:** `packages/backend/src/modules/articles/articles.controller.ts`

**Problem:** A route needs to be public (no auth required) but should ALSO parse the JWT if present (to show owner-only data like drafts).

**Gotcha:** `@Public()` makes the JwtAuthGuard skip entirely — `req.user` is undefined even if token is in header.

**Solution:** On public routes, manually check `req.user?.id` (it may be undefined). Call service method to check ownership separately.

```typescript
@Public()
@Get('api/publications/:slug/articles')
async list(@Req() req, @Param('slug') slug) {
  const userId = req.user?.id // may be undefined
  const isOwner = userId ? await this.service.isOwner(slug, userId) : false
  return this.service.find(slug, { includeAllStatuses: isOwner })
}
```

**Generalized:** Any NestJS app with public routes that benefit from optional auth context.

---

### Pattern 7: Docker Port Conflict Avoidance on Shared Server

**Category:** Rule | **Maturity:** Alpha | **Reusability:** High
**Source:** `docker-compose.yml`, `myinsights/INS-004`

**Problem:** Multiple Docker Compose projects on same server fight for standard ports (5432, 6379, 3000, 80).

**Solution:**
- Use `name:` in docker-compose.yml for namespaced container names
- Map to high-offset unique ports: app:3010, pg:5437, redis:6380, minio:9010
- Before choosing: `docker ps --format "table {{.Names}}\t{{.Ports}}"` to check occupied
- Remove nginx if Caddy/other reverse proxy already on 80/443

**Generalized:** Any multi-project Docker server.

---

## Insights Harvested (6)

| ID | Pattern | Reusability |
|----|---------|:-----------:|
| INS-001 | CORS fails on remote IP (use real IP, not localhost) | High |
| INS-002 | Frontend/backend API path mismatch | Medium |
| INS-003 | Registration must auto-login (return tokens) | High |
| INS-004 | Docker port conflicts on shared server | High |
| INS-005 | Tailwind v4 requires @tailwindcss/postcss | Medium |
| INS-006 | Article URLs need publication slug enrichment | Medium |

---

## Excluded (not extracted)

| Item | Reason |
|------|--------|
| Prisma schema (11 tables) | Domain-specific business logic |
| Email templates (article notification) | Domain-specific content |
| Analytics aggregation queries | Domain-specific metrics |
| Payout calculation logic | Domain-specific business rules |
| TipTap editor configuration | Standard library usage, well-documented |

---

## Recommendations for Next Harvest

1. **After v1.0:** Extract recommendation engine pattern (co-subscription collaborative filtering)
2. **After production:** Extract email deliverability warm-up playbook
3. **After scale:** Extract Prisma materialized views pattern for analytics
4. **Meta:** The `/replicate` pipeline itself is a harvestable methodology artifact

---

*Quick harvest completed. 7 artifacts extracted, 6 insights captured. All at Alpha maturity — validate in 1+ more project before promoting to Beta.*
