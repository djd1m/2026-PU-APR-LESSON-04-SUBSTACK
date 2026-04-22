# Security Rules — SubStack RU

## Input Validation

- **Backend:** All incoming data validated with `class-validator` decorators on DTOs
- **Frontend:** User-generated rich text sanitized with `DOMPurify` before render and before send
- **API params:** Validate types, lengths, formats — reject early with 400, never pass raw input to DB
- **File uploads:** Validate MIME type AND magic bytes (not just extension). Size limits enforced.
- **Prisma:** Use parameterized queries always. No string interpolation in queries.

## Authentication

- **JWT:** Signed with RS256 (asymmetric). Access token: 15 min. Refresh token: 30 days.
- **Password hashing:** bcrypt with **12 rounds** minimum. No MD5, SHA1, or unsalted hashes.
- **Session storage:** Refresh tokens stored in Redis with TTL. Invalidated on logout.
- **Email verification:** Required before first login. Token expires in 24h.
- **Password reset:** Time-limited token (1h), single-use, invalidated after use.
- **OAuth (future):** Use PKCE flow. Never store OAuth tokens in localStorage.

## Logging — No PII

- Never log: email addresses, phone numbers, full names, passport data, payment card numbers
- Never log: JWT token contents, passwords (even hashed), session tokens
- Log user actions by internal UUID only (e.g., `user_id: uuid`, not `email: user@example.com`)
- Payment logs: log transaction ID and status, never card details or CVV
- Error logs: strip PII from stack traces before external logging

## Webhook Security (Payments)

- **Verify HMAC signature FIRST** before reading any payload fields
- **CloudPayments:** Verify `X-Content-HMAC` header using HMAC-SHA256 with secret key
- **YooKassa:** Verify `X-Idempotence-Key` and signature per YooKassa docs
- **SBP:** Verify signature per NSPK specification
- Reject webhooks with invalid or missing signatures with 401 (do not process)
- **Idempotency:** Store processed webhook IDs in Redis. Skip duplicates silently (return 200).
- Webhook endpoints return 200 immediately; processing is async via BullMQ queue

## 152-FZ Data Localization

- All PostgreSQL data stored on Russian VPS (AdminVPS/HOSTKEY)
- No user PII sent to foreign services without explicit DPA and user consent
- Backups stored on Russian S3-compatible storage only
- Resend (email): transactional only, minimal PII in payload. DPA signed with Resend.
- No Google Analytics, Amplitude, or similar with raw PII. Use Yandex.Metrika.
- If CDN used for user content: Russian CDN provider only

## Rate Limiting

- Auth endpoints: 5 requests/minute per IP
- Registration: 3 requests/hour per IP
- Password reset: 3 requests/hour per email
- Payment webhooks: 100 requests/minute per provider IP range
- General API: 100 requests/minute per authenticated user

## CSRF Protection

- State-changing requests (POST, PUT, PATCH, DELETE) protected with CSRF tokens
- SameSite=Strict cookie attribute on session cookies
- Origin header validation on API endpoints

## Content Security Policy (CSP)

Minimum CSP headers on all responses:
```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'
```
Tighten per endpoint as needed.

## Payment Tokenization

- **Never store card numbers, CVV, or expiry dates** in any database or log
- Use payment provider tokens only (CloudPayments token, YooKassa payment method ID)
- Recurring payments via stored tokens from payment provider (not from our DB)
- PCI DSS: payment forms hosted by payment provider (iframe/redirect), not our frontend

## Security Headers

All API responses include:
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Strict-Transport-Security: max-age=31536000; includeSubDomains
Referrer-Policy: strict-origin-when-cross-origin
```

## Dependency Security

- Run `npm audit` before each deployment
- No packages with known Critical/High CVEs without documented mitigation
- Lock file (`package-lock.json`) committed and verified in CI
