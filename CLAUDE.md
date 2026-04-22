# SubStack RU — Russian Newsletter Platform

## Project Overview
Full Substack clone for Russian market. Email-first newsletter platform with paid subscriptions in rubles. Writer-First CJM: first paid subscriber in <30 days.

**Stack:** Next.js 15 + NestJS 10 + PostgreSQL 16 + Redis 7 + Resend + CloudPayments
**Architecture:** Distributed Monolith (Monorepo), Docker Compose on VPS Russia
**Business model:** 10% take rate from paid subscriptions

## Key Documentation
- `docs/PRD.md` — product requirements, personas, release strategy
- `docs/Architecture.md` — system design, tech stack, ADRs
- `docs/Specification.md` — user stories with Gherkin AC, NFRs
- `docs/Pseudocode.md` — data structures, algorithms, API contracts
- `docs/Refinement.md` — edge cases, testing strategy, optimizations
- `docs/Completion.md` — deployment, CI/CD, monitoring, launch plan
- `docs/Solution_Strategy.md` — SCQA, Game Theory, TRIZ analysis
- `docs/Research_Findings.md` — market research, 26 sources

## Architecture Constraints
- **Pattern:** Distributed Monolith (Monorepo)
- **Containers:** Docker + Docker Compose
- **Infrastructure:** VPS (AdminVPS/HOSTKEY) — servers in Russia (152-FZ)
- **Deploy:** Docker Compose direct deploy via SSH
- **Email:** Resend (API)
- **Payments:** CloudPayments (recurring) + SBP + YooKassa (fallback)
- **AI:** MCP servers

## 📋 Feature Roadmap
Roadmap: [.claude/feature-roadmap.json](.claude/feature-roadmap.json) — single source of truth for feature status.
Sprint progress and next steps are injected automatically at session start.
Quick check: `/next` | Full overview: ask "what should I work on?"
Mark done: `/next [feature-id]` | Update all: `/next update`

## 🔄 Feature Development Lifecycle
New features use the 4-phase lifecycle: `/feature [name]`
1. **PLAN** — sparc-prd-mini → `docs/features/<n>/sparc/`
2. **VALIDATE** — requirements-validator swarm → score ≥70
3. **IMPLEMENT** — parallel agents from validated docs
4. **REVIEW** — brutal-honesty-review swarm → fix all criticals

## 🚀 Automation Commands
- `/start` — bootstrap project from docs (monorepo + Docker + DB)
- `/run` or `/run mvp` — bootstrap + implement all MVP features in a loop
- `/run all` — bootstrap + implement ALL features
- `/go [feature]` — auto-select pipeline (/plan or /feature) and implement
- `/next` — show sprint progress and next suggested tasks
- `/feature [name]` — full 4-phase SPARC lifecycle (15-30 min)
- `/plan [name]` — lightweight plan for simple tasks (2-5 min)
- `/test [scope]` — run tests (unit, integration, e2e)
- `/deploy [env]` — deploy to staging or production
- `/docs` — generate bilingual documentation (RU/EN) in /README/
- `/myinsights [title]` — capture development insight
- `/review [scope]` — on-demand code review
- `/harvest` — extract knowledge from project into reusable toolkit

### Command Hierarchy
```
/run mvp
  └── /start (bootstrap)
  └── LOOP:
      ├── /next (find next feature)
      └── /go <feature>
          ├── /plan (simple tasks, score ≤ -2)
          └── /feature (standard features, score > -2)
```

## 🔍 Development Insights (живая база знаний)
Index: [myinsights/1nsights.md](myinsights/1nsights.md) — check here FIRST before debugging.
On error → grep the error string in the index → read only the matched detail file.
Capture new findings: `/myinsights [title]`

## Available Agents
- `@planner` — implementation planning from Pseudocode.md
- `@code-reviewer` — quality review against Refinement.md
- `@architect` — system design from Architecture.md

## Available Skills
Lifecycle: `sparc-prd-mini`, `explore`, `goap-research-ed25519`, `problem-solver-enhanced`, `requirements-validator`, `brutal-honesty-review`
Project: `project-context`, `coding-standards`, `testing-patterns`, `feature-navigator`

## Parallel Execution Strategy
- Use `Task` tool for independent subtasks
- Run tests, linting, type-checking in parallel
- For complex features: spawn specialized agents
- Frontend + backend can be developed in parallel when independent
