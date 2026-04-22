# [INS-001] CORS fails when frontend uses localhost but browser runs on remote IP

**Date:** 2026-04-22
**Status:** Active
**Severity:** Critical
**Tags:** `cors`, `nestjs`, `deployment`, `networking`
**Hits:** 1

## Error Signatures
```
Запрос из постороннего источника заблокирован
not allowed by CORS
Политика одного источника запрещает чтение удалённого ресурса
CORS request failed
```

## Symptoms
Frontend at `http://212.192.0.33:3011` makes API calls to `http://localhost:3010`. Browser on user's machine interprets `localhost` as user's own machine, not the server. CORS preflight fails because origins don't match.

## Diagnostic Steps
1. Checked browser console — CORS error on API requests
2. Checked NestJS CORS config — hardcoded `localhost` origins only
3. Realized `NEXT_PUBLIC_API_URL` must use server's real IP, not localhost

## Root Cause
Two issues combined:
1. `NEXT_PUBLIC_API_URL` was set to `http://localhost:3010` — works on server but not from external browser
2. NestJS CORS whitelist only included localhost origins

## Solution
1. Set `NEXT_PUBLIC_API_URL=http://<server-ip>:3010/api` when starting frontend
2. Changed NestJS CORS to allow all origins in development mode:
```typescript
app.enableCors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // curl, mobile
    if (nodeEnv === 'development') return callback(null, true);
    // production: check whitelist
  },
  credentials: true,
});
```

## Prevention
- Always use real server IP (not localhost) for `NEXT_PUBLIC_*` env vars
- In dev mode, allow all CORS origins by default
- Add `.env.development` with correct API URL pre-configured
