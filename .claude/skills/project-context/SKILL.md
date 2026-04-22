---
name: project-context
description: >
  SubStack RU project overview skill. Provides quick access to project identity,
  personas, MVP feature scope, and architecture overview. Use when you need to
  orient yourself in the project or answer "what is this project about" questions.
  Trigger: "what is this project", "project overview", "SubStack RU context".
version: "1.0"
maturity: production
---

# Project Context: SubStack RU

## What Is SubStack RU

SubStack RU is a **Russian Substack clone** — a newsletter and paid subscription platform
built for Russian-speaking writers and their audiences. It is a full feature clone of
Substack adapted for the Russian market: Russian payment methods, 152-FZ compliance,
Yandex SEO optimization, and Russian-language UX.

**Core value proposition:** A writer creates a publication, writes articles, and earns
money through paid subscriptions — all in one platform, optimized for Russia.

## Product Philosophy: Writer-First CJM

The product is designed around the **Writer's Customer Journey**:

```
Discover → Register → Setup Publication → Write First Article →
Invite Subscribers → First Paid Subscriber → Earn First Payout
```

Every feature decision is evaluated against: "Does this help the writer earn faster?"

## Key Documentation

| Doc | Location | Purpose |
|-----|----------|---------|
| Product Requirements | `docs/PRD.md` | Features, MoSCoW, product decisions |
| Specification | `docs/Specification.md` | User stories, acceptance criteria |
| Architecture | `docs/Architecture.md` | System design, module map |
| Solution Strategy | `docs/Solution_Strategy.md` | Tech choices, rationale |
| Pseudocode | `docs/Pseudocode.md` | Algorithm structures |
| Architecture Refinement | `docs/Refinement.md` | Edge cases, error scenarios |
| Product Discovery | `docs/Product_Discovery_Brief.md` | Market analysis, personas |

## Three Personas

### 1. Writer (Primary)
- Russian blogger, journalist, or expert
- Wants to monetize their audience
- Needs: article editor, email delivery, paid subscriptions, analytics, payouts
- Pain point: existing platforms take high commission or lack Russian payment methods

### 2. Subscriber (Secondary)
- Reader who follows writers
- Wants: easy subscription, good reading experience, email delivery
- Pain point: paying for foreign platforms is difficult with Russian cards

### 3. Platform Admin (Internal)
- SubStack RU team member
- Needs: user management, fraud prevention, payout control, content moderation

## MVP Features (MoSCoW Must)

| Feature ID | Feature | Notes |
|-----------|---------|-------|
| `auth-registration` | Registration + Email Verification | Writer and subscriber signup |
| `publication-setup` | Publication profile setup | Custom domain, bio, cover image |
| `article-editor` | Rich text article editor | Markdown-like, image upload |
| `email-delivery` | Email delivery to subscribers | Via Resend API, HTML emails |
| `paid-subscriptions` | Paid subscription management | CloudPayments + SBP + YooKassa |
| `author-analytics` | Author analytics dashboard | Open rates, subscriber growth |
| `yandex-seo` | Yandex SEO optimization | Meta tags, structured data, sitemap |
| `csv-export` | Subscriber list CSV export | For writers |
| `author-payouts` | Author payout system | Withdrawal to Russian bank accounts |

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                   Docker Compose (VPS Russia)         │
│                                                      │
│  ┌──────────┐    ┌──────────┐    ┌──────────────┐  │
│  │ Next.js  │───▶│ NestJS   │───▶│ PostgreSQL   │  │
│  │    15    │    │    10    │    │     16       │  │
│  │ (web)    │    │  (api)   │    │   (db)       │  │
│  └──────────┘    └────┬─────┘    └──────────────┘  │
│                       │                              │
│                  ┌────┴─────┐    ┌──────────────┐  │
│                  │  BullMQ  │───▶│  Redis 7     │  │
│                  │ (worker) │    │  (cache)     │  │
│                  └──────────┘    └──────────────┘  │
└─────────────────────────────────────────────────────┘
         │                    │
    ┌────▼────┐         ┌─────▼──────────────────┐
    │  Resend  │         │ CloudPayments / SBP /  │
    │ (email)  │         │ YooKassa (payments)    │
    └──────────┘         └────────────────────────┘
```

## Tech Stack Quick Reference

| Component | Technology |
|-----------|-----------|
| Frontend | Next.js 15, App Router, TypeScript, Tailwind CSS |
| Backend | NestJS 10, TypeScript strict, Prisma ORM |
| Database | PostgreSQL 16 |
| Cache / Queue | Redis 7 + BullMQ |
| Email | Resend API |
| Payments | CloudPayments, SBP (NSPK), YooKassa |
| Deployment | Docker Compose, VPS Russia |
| Compliance | 152-FZ (personal data localization) |

## Regulatory Context

**152-FZ Federal Law on Personal Data:**
- All user data stored in Russia
- No transfer of PII to foreign services without consent
- Audit logging required for data access
- Right to erasure must be implemented
