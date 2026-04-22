# SubStack RU — Executive Summary

---

## Overview

SubStack RU — российская платформа для независимых создателей контента, позволяющая публиковать email-рассылки, подкасты и видео с монетизацией через платные подписки в рублях. Полный клон Substack, адаптированный под российский рынок: локальные платежи (CloudPayments, СБП, YooKassa), комплаенс 152-ФЗ, Yandex SEO, рекомендательная сеть и AI-помощник для авторов.

## Problem & Solution

**Problem:** Российские создатели контента не могут монетизировать аудиторию через email-рассылки. Западные платформы (Substack, Ghost, Beehiiv) не принимают российские платежи. Boosty не имеет email-инструментов. Дзен берёт 30%+ без email-доставки. Рынок ₽5-8B GMV/год не обслужен.

**Solution:** Full clone Substack с Writer-First CJM: бесплатный запуск, 10% take rate, рублёвые платежи, CSV-экспорт email-базы (owned audience), реферальная программа, discovery-сеть, compliance-as-a-service (авто-регистрация в реестре блогеров).

## Target Users

| Persona | Описание | % рынка |
|---------|----------|:-------:|
| **Независимые авторы** | Журналисты, блогеры, эссеисты. 28-45 лет. | ~50% |
| **Эксперты / Преподаватели** | Бизнес, финансы, психология. 30-50 лет. | ~30% |
| **Подкастеры** | Audio/video создатели. 25-38 лет. | ~20% |

## Key Features (MVP → v2.0)

| # | Feature | Phase | Value |
|---|---------|-------|-------|
| 1 | Newsletter publishing (Markdown + Rich Text) | MVP | Публикация и доставка контента |
| 2 | Платные подписки (CloudPayments + СБП) | MVP | Монетизация с первого дня |
| 3 | Yandex SEO (SSR, sitemap) | MVP | Органический рост |
| 4 | CSV-экспорт email-списка | MVP | Owned audience — zero lock-in |
| 5 | Рекомендательная сеть | v1.0 | 25% новых подписок (бенчмарк Substack) |
| 6 | Реферальная программа (tiered) | v1.0 | 2-3x конверсия vs flat referral |
| 7 | AI co-pilot в редакторе | v1.0 | Экономия 1-3 часа/неделю |
| 8 | Микро-типпинг (донаты) | v1.0 | Entry ramp к подписке |
| 9 | Подкасты + Audio TTS | v1.5 | 2x время в приложении |
| 10 | Bundle Pass + Магазин | v2.0 | Diversified revenue |

## Technical Approach

| Аспект | Решение |
|--------|---------|
| **Architecture** | Distributed Monolith (Monorepo) |
| **Frontend** | Next.js 15 (SSR + CSR) |
| **Backend** | NestJS 10, TypeScript |
| **Database** | PostgreSQL 16 + Redis 7 |
| **Email** | Resend (Russian ESP) |
| **Payments** | CloudPayments + СБП + YooKassa |
| **Infrastructure** | Docker Compose on VPS (Russia) |
| **Deploy** | GitHub Actions → SSH → Docker Compose |
| **Key Differentiators** | Russian payments, 152-ФЗ compliance, Yandex SEO, owned audience |

## Research Highlights

1. **Структурный gap:** Ни одна платформа не совмещает email + РФ платежи + 152-ФЗ
2. **Регуляторный moat:** Западные платформы юридически не могут работать в РФ (Stripe заблокирован, 152-ФЗ)
3. **Proven model:** Substack — $1.1B unicorn, $45M ARR, 5M+ paid subs
4. **Market timing:** Creator economy РФ +37% YoY, digital subscriptions +74.5% YoY
5. **Micro-trends:** 15 actionable трендов интегрированы в CJM (AI, TTS, bundles, tipping, gamification)

## Success Metrics

| Метрика | MVP (M3) | v1.0 (M6) | v2.0 (M12) |
|---------|---------|----------|-----------|
| Active authors | 100 | 500 | 2,000 |
| Total subscribers | 5,000 | 50,000 | 500,000 |
| Paid subscribers | 200 | 5,000 | 50,000 |
| MRR (platform) | ₽50K | ₽500K | ₽2.5M |
| Break-even | — | — | ₽1.6M/мес burn |

## Timeline & Phases

| Phase | Features | Timeline |
|-------|----------|----------|
| **MVP** | Newsletter + payments + analytics + SEO | Month 1-3 |
| **v1.0** | Recommendations + referrals + AI + tips | Month 4-6 |
| **v1.5** | Podcasts + video + TTS + Quick Posts | Month 7-9 |
| **v2.0** | Bundles + store + gamification + API | Month 10-12 |

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Cold start (мало авторов) | Seed 20-50 авторов с 0% take rate |
| Boosty добавит email | Network effect + Yandex SEO moat + AI |
| Email deliverability | Russian ESP (Resend), dedicated IP, warm-up |
| Регуляторное давление | Compliance-first архитектура |
| Payment processor downtime | 3 провайдера с failover |

## Immediate Next Steps

1. Зарегистрировать юрлицо (ООО), открыть расчётный счёт
2. Подключить CloudPayments merchant account
3. Запустить email warm-up на Resend (2 недели до launch)
4. Разработать MVP (Month 1-3)
5. Seed 20-50 anchor-авторов для cold start

## Documentation Package

| Документ | Описание |
|----------|----------|
| [PRD.md](PRD.md) | Product Requirements Document |
| [Solution_Strategy.md](Solution_Strategy.md) | SCQA + First Principles + Game Theory + TRIZ |
| [Specification.md](Specification.md) | User Stories + Gherkin + NFRs |
| [Pseudocode.md](Pseudocode.md) | Data Structures + Algorithms + API |
| [Architecture.md](Architecture.md) | System Design + Tech Stack + ADRs |
| [Refinement.md](Refinement.md) | Edge Cases + Testing + Optimizations |
| [Completion.md](Completion.md) | Deployment + CI/CD + Monitoring |
| [Research_Findings.md](Research_Findings.md) | Market Research + 26 Sources |
| [Product_Discovery_Brief.md](Product_Discovery_Brief.md) | Phase 0 Discovery |
| [cjm-prototype.html](cjm-prototype.html) | Interactive CJM (3 variants) |

---

*SPARC Documentation Package: 11 documents. Ready for Vibe Coding.*
