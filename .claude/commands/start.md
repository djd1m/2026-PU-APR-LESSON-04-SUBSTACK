---
description: Bootstrap SubStack RU project from documentation. Generates monorepo skeleton, all packages, Docker configs, database schema, core modules, and basic tests. $ARGUMENTS: optional flags --skip-tests, --skip-seed, --dry-run.
---

# /start $ARGUMENTS

## Purpose

One-command project generation from documentation → working monorepo with `docker compose up`.

## Prerequisites

- Documentation in `docs/` directory (SPARC output)
- CC toolkit in project root (CLAUDE.md, .claude/)
- Node.js 20+, npm 10+
- Docker + Docker Compose installed
- Git initialized

## Process

### Phase 1: Foundation (sequential — everything depends on this)

1. **Read all project docs** to build full context:
   - `docs/Architecture.md` → monorepo structure, Docker Compose, tech stack
   - `docs/Specification.md` → data model, API endpoints, NFRs
   - `docs/Pseudocode.md` → core algorithms, business logic
   - `docs/Completion.md` → env config, deployment setup
   - `docs/PRD.md` → features, user personas (for README)
   - `docs/Refinement.md` → edge cases, testing strategy

2. **Generate root configs:**
   - `package.json` (workspaces: packages/*)
   - `tsconfig.base.json`
   - `docker-compose.yml` (from Architecture: nginx, app, worker, scheduler, postgres, redis, minio)
   - `.env.example` (from Completion: DATABASE_URL, REDIS_URL, RESEND_API_KEY, CLOUDPAYMENTS_*, etc.)
   - `.gitignore`

3. **Git commit:** `chore: project root configuration`

### Phase 2: Packages (parallel via Task tool)

Launch 3 parallel tasks:

#### Task A: packages/shared
Read and use as source:
- `docs/Pseudocode.md` → data structures, types
- `docs/Specification.md` → validation rules

Generate:
- TypeScript types from Pseudocode data structures
- Shared validation schemas (Zod)
- Utility functions
- Unit tests

**Commits:** `feat(shared): types and validation schemas`

#### Task B: packages/backend
Read and use as source:
- `docs/Specification.md` → data model → Prisma schema
- `docs/Architecture.md` → API endpoints → NestJS modules
- `docs/Pseudocode.md` → algorithms → service implementations
- `docs/Completion.md` → env config → config module

Generate:
- `prisma/schema.prisma` from Pseudocode data structures
- NestJS modules: auth, publications, articles, subscriptions, payments, payouts, email, analytics, recommendations, referrals, tips, admin
- Service layer from Pseudocode algorithms
- Payment webhook handlers (CloudPayments, SBP, YooKassa)
- Email service (Resend integration)
- Bull queue workers
- Cron scheduler
- Guards, interceptors, pipes
- Unit tests for services
- `package.json` with dependencies

**Commits:** `feat(backend): prisma schema`, `feat(backend): auth module`, `feat(backend): core modules`, `feat(backend): payment webhooks`

#### Task C: packages/frontend
Read and use as source:
- `docs/PRD.md` → user personas, journeys
- `docs/Specification.md` → user stories → pages
- `docs/Architecture.md` → routes, component structure

Generate:
- Next.js 15 app with App Router
- Pages: landing, publication, article, dashboard, editor, auth
- Components: layout, header, footer, article-card, paywall, subscription-form, analytics-charts
- Hooks: useAuth, usePublication, useArticles, useSubscription, useAnalytics
- API client (fetch wrapper)
- TipTap editor setup
- Tailwind CSS config
- `package.json` with dependencies

**Commits:** `feat(frontend): next.js app structure`, `feat(frontend): pages and components`, `feat(frontend): editor and hooks`

### Phase 3: Integration (sequential)

1. **Verify cross-package imports** (shared types used in backend and frontend)
2. **Docker build:** `docker compose build`
3. **Start services:** `docker compose up -d`
4. **Database setup:**
   - `npx prisma migrate dev --name init`
   - `npx prisma db seed` (admin user, test publication)
5. **Health check:** `curl http://localhost:3000/api/health`
6. **Run tests:** `npm test --workspaces`
7. **Git commit:** `chore: verify docker integration`

### Phase 4: Finalize

1. Generate/update `README.md` with quick start instructions
2. Final git tag: `git tag v0.1.0-scaffold`
3. Push: `git push origin HEAD --tags`
4. Report summary

## Output

After /start completes:
```
substack-ru/
├── packages/
│   ├── shared/          # Types, validation, utilities
│   ├── backend/         # NestJS API + workers
│   │   ├── prisma/      # Schema + migrations
│   │   └── src/         # Modules, services, controllers
│   └── frontend/        # Next.js app
│       └── src/         # Pages, components, hooks
├── docker-compose.yml   # All services
├── .env.example         # Environment variables
├── package.json         # Workspaces root
└── tsconfig.base.json   # Shared TS config
```

## Flags

- `--skip-tests` — skip test file generation (faster, not recommended)
- `--skip-seed` — skip database seeding
- `--dry-run` — show plan without executing

## Error Recovery

If a task fails mid-generation:
- All completed phases are committed to git
- Re-run `/start` — it detects existing files and skips completed phases
- Or fix the issue manually and continue
