# [INS-003] Registration doesn't return token — user not logged in after signup

**Date:** 2026-04-22
**Status:** Active
**Severity:** Critical
**Tags:** `auth`, `registration`, `jwt`, `ux`
**Hits:** 1

## Error Signatures
```
redirect /auth/login
isAuthenticated false
register no token
```

## Symptoms
After successful registration, user is immediately redirected to `/auth/login`. Dashboard layout checks `isAuthenticated` from Zustand store — it's `false` because registration response didn't include a token.

## Diagnostic Steps
1. Registered new user — redirected to login
2. Checked backend register response — returns `{message}` only, no token
3. Checked frontend auth store — expects `{token, user}` from both login and register
4. Also found: new users created with `role: reader` — can't create publications (need `author`)

## Root Cause
Three issues:
1. Backend `register()` returned `{message: "..."}` without tokens — no auto-login
2. Frontend auth store expected `{token}` but login returns `{accessToken}` — field name mismatch
3. Users created with `role: reader` instead of `role: author` — can't create publications

## Solution
1. Backend `register()` now generates JWT tokens and returns `{accessToken, refreshToken, user}` + sets httpOnly cookies
2. Frontend auth store updated to read `data.accessToken` instead of `data.token`
3. Default role changed from `reader` to `author` for new registrations
4. Backend `login()` also now returns `{accessToken, refreshToken}` in response body (was only setting cookies)

## Prevention
- Registration should ALWAYS auto-login (return tokens) unless email verification is blocking
- Keep frontend auth interface and backend response shape in sync (shared types)
- For MVP: default to `author` role. Add role selection later
- Test the full flow: register → dashboard access → create publication → write article
