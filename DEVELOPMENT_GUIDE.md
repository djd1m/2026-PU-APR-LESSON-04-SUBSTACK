# Development Guide: SubStack RU

## Quick Start

```bash
# 1. Bootstrap project
/start

# 2. Build MVP features automatically
/run mvp

# 3. Or build one feature at a time
/next              # see what to work on
/go <feature>      # auto-implement
```

## Development Workflows

### Autonomous Build (recommended)
```bash
/run               # bootstrap + implement all MVP features → tag v0.1.0-mvp
/run all           # implement ALL features → tag v1.0.0
```

### Single Feature
```bash
/go <feature>      # auto-selects /plan or /feature based on complexity
```

### Manual Control
```bash
/plan <task>       # lightweight plan (simple tasks, ≤3 files)
/feature <name>    # full SPARC lifecycle (complex features)
```

## Feature Workflow

1. `/next` — see current sprint status and suggested tasks
2. Pick a feature → it appears as "in_progress" in roadmap
3. Implement using `/feature [name]` or `/plan [name]`
4. When done → `/next [feature-id]` to mark complete
5. Feature roadmap auto-commits on session end

## Testing

```bash
/test              # run all tests
/test coverage     # with coverage report
/test api          # backend only
/test web          # frontend only
```

## Deployment

```bash
/deploy staging    # deploy to staging VPS
/deploy production # deploy to production (with confirmation)
```

## Documentation

```bash
/docs              # generate RU + EN docs in /README/
/docs rus          # Russian only
/docs update       # update existing docs
```

## Knowledge Management

```bash
/myinsights <title>    # capture a development insight
/myinsights archive INS-001  # archive obsolete insight
/harvest               # extract knowledge from project
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router, SSR + CSR) |
| Styling | Tailwind CSS 4 |
| Editor | TipTap 2 (ProseMirror) |
| Backend | NestJS 10 |
| ORM | Prisma 6 |
| Database | PostgreSQL 16 |
| Cache/Queue | Redis 7 + Bull 5 |
| Email | Resend (API) |
| Payments | CloudPayments + SBP + YooKassa |
| Infra | Docker Compose on VPS (Russia) |
| CI/CD | GitHub Actions |

## Project Structure

```
substack-ru/
├── CLAUDE.md                    # Project context for AI
├── DEVELOPMENT_GUIDE.md         # This file
├── docs/                        # SPARC documentation
│   ├── PRD.md
│   ├── Architecture.md
│   ├── Specification.md
│   ├── Pseudocode.md
│   ├── features/                # Per-feature SPARC docs
│   └── plans/                   # Lightweight plans
├── packages/
│   ├── shared/                  # Types, validation, utilities
│   ├── backend/                 # NestJS API + workers
│   └── frontend/                # Next.js app
├── .claude/
│   ├── commands/                # /start, /feature, /run, etc.
│   ├── agents/                  # planner, code-reviewer, architect
│   ├── skills/                  # 10 shared + 4 project-specific
│   ├── rules/                   # git-workflow, security, etc.
│   ├── hooks/                   # SessionStart context
│   └── feature-roadmap.json     # Feature status tracking
├── myinsights/                  # Development knowledge base
├── docker-compose.yml           # All services
└── .env.example                 # Environment variables
```
