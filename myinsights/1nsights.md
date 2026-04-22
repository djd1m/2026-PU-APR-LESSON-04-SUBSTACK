# Development Insights Index

Living knowledge base. **Read this file first** — then load specific detail files as needed.

> **For Claude Code:** When you encounter an error, `grep` the Error Signatures column below.
> If you find a match, read ONLY the linked detail file — don't load everything.

| ID | Error Signatures | Summary | Status | Hits | File |
|----|-----------------|---------|--------|------|------|
| INS-001 | `CORS`, `not allowed by CORS`, `Политика одного источника` | CORS fails when frontend uses localhost but browser runs on remote IP | Active | 1 | [INS-001-cors-remote-ip.md](INS-001-cors-remote-ip.md) |
| INS-002 | `404 Not Found`, `/author/articles`, `Cannot POST` | Frontend editor uses wrong API endpoint path | Active | 1 | [INS-002-editor-wrong-endpoint.md](INS-002-editor-wrong-endpoint.md) |
| INS-003 | `redirect /auth/login`, `isAuthenticated false`, `register no token` | Registration doesn't return token — user not logged in after signup | Active | 1 | [INS-003-register-no-autologin.md](INS-003-register-no-autologin.md) |
| INS-004 | `EADDRINUSE`, `port already allocated`, `port conflict` | Docker port conflicts with other containers on shared server | Active | 1 | [INS-004-docker-port-conflicts.md](INS-004-docker-port-conflicts.md) |
| INS-005 | `@tailwindcss/postcss`, `Cannot find module`, `PostCSS plugin` | Tailwind v4 requires @tailwindcss/postcss package for Next.js | Active | 1 | [INS-005-tailwind-v4-postcss.md](INS-005-tailwind-v4-postcss.md) |
