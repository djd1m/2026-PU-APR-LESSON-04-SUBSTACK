---
description: Run tests for SubStack RU project. Supports scoped runs per package,
  coverage reports, and full workspace test suite.
  $ARGUMENTS: optional — package name, "coverage", "all", or "watch"
---

# /test $ARGUMENTS

## Overview

Test runner for SubStack RU monorepo (Next.js + NestJS + PostgreSQL + Redis).
Runs tests via npm workspaces, supports per-package scoping and coverage reports.

## Default: Run All Tests

When `$ARGUMENTS` is empty or "all":

```bash
# Run all workspace tests
npm test --workspaces --if-present

# Or with coverage
npm run test:ci --workspaces --if-present
```

## /test [scope]

Run tests for a specific package or module:

```
Supported scopes:
  api          → apps/api (NestJS backend)
  web          → apps/web (Next.js frontend)
  shared       → packages/shared (shared types/utilities)
  emails       → packages/emails (Resend email templates)
  [path]       → any path, e.g. "src/auth" or "src/newsletter"
```

**Examples:**

```bash
# Test only the API package
/test api
→ npm test --workspace=apps/api

# Test only the web app
/test web
→ npm test --workspace=apps/web

# Test shared package
/test shared
→ npm test --workspace=packages/shared

# Test emails package (Resend templates)
/test emails
→ npm test --workspace=packages/emails

# Test specific module by path
/test src/auth
→ npm test --workspace=apps/api -- --testPathPattern="src/auth"
```

## /test coverage

Run full test suite with coverage report:

```bash
npm run test:cov --workspaces --if-present
```

After running, display summary:
```
📊 Coverage Report:

apps/api:
  Statements: XX%
  Branches: XX%
  Functions: XX%
  Lines: XX%

apps/web:
  Statements: XX%
  ...

⚠️ Below threshold (<80%): [list files if any]
```

## /test watch

Run tests in watch mode for active development:

```bash
# Watch API tests
npm run test:watch --workspace=apps/api

# Or specific scope in watch mode
npm run test:watch --workspace=apps/[scope]
```

## /test all

Runs the complete test suite including integration tests:

```bash
# Step 1: Ensure Docker services are running (PostgreSQL, Redis)
docker compose ps

# Step 2: Run unit tests
npm test --workspaces --if-present

# Step 3: Run integration tests (requires running DB/Redis)
npm run test:e2e --workspace=apps/api --if-present

# Step 4: Report
```

## Test Stack

| Package | Framework | Config |
|---------|-----------|--------|
| `apps/api` | Jest + Supertest (NestJS) | `jest.config.ts` |
| `apps/web` | Jest + React Testing Library (Next.js) | `jest.config.ts` |
| `packages/shared` | Jest | `jest.config.ts` |
| `packages/emails` | Jest (Resend mock) | `jest.config.ts` |

## Output Format

After each test run:

```
🧪 Test Results: SubStack RU

✅ apps/api:     XX passed, 0 failed (Xs)
✅ apps/web:     XX passed, 0 failed (Xs)
✅ packages/shared: XX passed, 0 failed (Xs)

Total: XX passed, 0 failed

💡 If tests fail due to env issues, check:
   - Docker services running: docker compose ps
   - .env.test file exists and configured
   - Database migrations applied: npm run db:migrate --workspace=apps/api
```

## Troubleshooting

Before running tests, check `myinsights/1nsights.md` for known test configuration issues:
```bash
grep -i "jest\|test\|coverage" myinsights/1nsights.md
```

Common issues:
- `ts-jest` requires `ts-node` as peer dependency
- Jest `coverageThreshold` (singular, not plural) — check spelling carefully
- PostgreSQL test DB must be running for integration tests
- Resend email calls should be mocked in unit tests (`jest.mock('@resend/node')`)
