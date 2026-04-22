# Specification: Russian Newsletter Platform

**Версия:** 0.1 | **Дата:** 2026-04-22 | **Статус:** Draft

---

## 1. Feature Matrix

| Feature | MVP | v1.0 | v1.5 | v2.0 | Priority |
|---------|:---:|:----:|:----:|:----:|----------|
| Редактор статей (Markdown + Rich Text) | ✅ | | | | Must |
| Email-доставка (free/paid разделение) | ✅ | | | | Must |
| Платные подписки (CloudPayments + СБП) | ✅ | | | | Must |
| Профиль автора + публичная страница | ✅ | | | | Must |
| Базовая аналитика (subscribers, opens) | ✅ | | | | Must |
| Yandex SEO (SSR, meta, sitemap) | ✅ | | | | Must |
| Регистрация / авторизация | ✅ | | | | Must |
| CSV-экспорт email-списка | ✅ | | | | Must |
| Рекомендательная сеть | | ✅ | | | Should |
| Реферальная программа (tiered) | | ✅ | | | Should |
| AI co-pilot в р��дакторе | | ✅ | | | Should |
| Микро-типпинг (донаты) | | ✅ | | | Should |
| Админ-панель (модерация, РКН) | | ✅ | | | Should |
| Подкасты (хостинг + RSS) | | | ✅ | | Could |
| Видео (нативный хост��нг) | | | ✅ | | Could |
| Quick Posts (short-form) | | | ✅ | | Could |
| Audio TTS (авто-оз��учка) | | | ✅ | | Could |
| Bundle Pass (коллективные подписки) | | | | ✅ | Could |
| Магазин цифровых продуктов | | | | ✅ | Could |
| Геймификация (streaks, badges) | | | | ✅ | Could |
| API для интеграций | | | | ✅ | Could |
| Реестр блогеров (авто-регистрация) | | | | ✅ | Could |

---

## 2. User Stories (MVP)

### US-001: Регистрация автора

**As a** создатель контента,
**I want to** зарегистрироваться на платформе за 2 минуты,
**So that** я могу начать публиковать и зарабатывать.

**Priority:** Must | **Effort:** M

```gherkin
Feature: Author Registration

  Scenario: Successful registration via email
    Given I am on the registration page
    When I enter my email "author@example.com" and password
    And I confirm my email via the verification link
    Then my account is created
    And I see the publication setup wizard

  Scenario: Registration with existing email
    Given "author@example.com" is already registered
    When I try to register with "author@example.com"
    Then I see "Этот email уже зарегистрирован"
    And I am offered to log in or reset password

  Scenario: Password requirements
    Given I am on the registration page
    When I enter a password shorter than 8 characters
    Then I see "Пароль должен быть не менее 8 символов"
```

### US-002: Создание публикации

**As a** зарегистрированный автор,
**I want to** создать свою публикацию (название, описание, аватар),
**So that** у меня есть бренд и публичная страница.

**Priority:** Must | **Effort:** M

```gherkin
Feature: Publication Setup

  Scenario: Create publication
    Given I am a registered author
    When I enter publication name "Мой Блог" and description
    And I upload an avatar image
    Then my publication is created
    And I have a public URL at /{slug}

  Scenario: Publication URL generation
    Given I create a publication named "Мой ��лог"
    Then the slug is auto-generated as "moy-blog"
    And I can customize it to any available slug

  Scenario: Duplicate slug
    Given slug "tech-news" is already taken
    When I try to set my slug to "tech-news"
    Then I see "Этот адрес уже занят"
    And I am suggested "tech-news-2"
```

### US-003: Написание и публикация статьи

**As a** автор с публика��ией,
**I want to** написать статью в удобном редакторе и опубликовать,
**So that** она доставляется подписчикам по email и доступ��а на сайте.

**Priority:** Must | **Effort:** L

```gherkin
Feature: Article Publishing

  Scenario: Write and publish article
    Given I am in the editor
    When I write an article with title "Первый пост"
    And I set visibility to "free" (all subscribers)
    And I click "Опубликовать"
    Then the article is published on my public page
    And email is sent to all subscribers
    And the article is indexable by Yandex

  Scenario: Schedule publication
    Given I have a draft article
    When I set publish date to "2026-04-25 10:00 MSK"
    And I click "Запланировать"
    Then the article is published at the scheduled time
    And email is sent at that time

  Scenario: Paid-only article
    Given I have paid subscriptions enabled
    When I set visibility to "paid subscribers only"
    And I publish the article
    Then free subscribers receive a teaser (first 3 paragraphs)
    And paid subscribers receive the full article
    And the public page shows a paywall after the teaser

  Scenario: Draft auto-save
    Given I am writing an article
    When I stop typing for 5 seconds
    Then the draft is auto-saved
    And I see "Черновик сохранён" indicator
```

### US-004: Подписка читателя (бесплатная)

**As a** читат��ль,
**I want to** подписаться на автора бесплатно,
**So that** я получаю новые статьи по email.

**Priority:** Must | **Effort:** S

```gherkin
Feature: Free Subscription

  Scenario: Subscribe via publication page
    Given I am on author's publication page
    When I enter my email and click "Подписатьс��"
    Then I receive a confirmation email
    And after confirming, I am subscribed
    And I receive new free articles by email

  Scenario: Unsubscribe
    Given I am subscribed to "Мой Блог"
    When I click "Отписаться" in any email footer
    Then I am unsubscribed immediately
    And I see a confirmation page
```

### US-005: Платна�� подписка

**As a** читатель,
**I want to** оформить платную подписку на автора,
**So that** я получаю доступ к premium-контенту.

**Priority:** Must | **Effort:** L

```gherkin
Feature: Paid Subscription

  Scenario: Subscribe with bank card (CloudPayments)
    Given author has paid tier at 500 RUB/month
    When I click "Оформить подписку"
    And I enter my card details (Mir/Visa)
    And payment succeeds
    Then I am a paid subscriber
    And I receive all paid articles by email
    And author receives 90% of payment (500 - 50 platform - fees)

  Scenario: Subscribe via SBP
    Given author has paid tier
    When I choose "Оплата через СБП"
    And I scan the QR code / select my bank
    And payment succeeds
    Then I am a paid subscriber

  Scenario: Failed payment
    Given I am trying to subscribe
    When my payment fails
    Then I see "Оплата не прошла. Попробуйте другой способ"
    And no subscription is created

  Scenario: Cancel subscription
    Given I am a paid subscriber
    When I click "Отменить подписку" in account settings
    Then recurring payments stop
    And I retain access until end of current billing period
    And author is notified about the cancellation

  Scenario: Recurring payment
    Given I subscribed on April 1
    When May 1 arrives
    Then CloudPayments charges my card automatically
    And if successful, subscription continues
    And if failed, I receive "Обновите способ оплаты" email with 3-day grace
```

### US-006: Аналитика автора

**As a** автор,
**I want to** видеть статистику по подписчикам и статьям,
**So that** я понимаю, что работает, и могу улучшить контент.

**Priority:** Must | **Effort:** M

```gherkin
Feature: Author Analytics

  Scenario: Dashboard overview
    Given I am an author with published articles
    When I open the analytics dashboard
    Then I see total subscribers (free + paid)
    And I see monthly revenue (RUB)
    And I see open rate per article
    And I see growth chart (subscribers over time)

  Scenario: Per-article metrics
    Given I published "Первый пост"
    When I view article analytics
    Then I see email delivery count
    And I see open rate (%)
    And I see click rate (%)
    And I see new subscribers from this article
```

### US-007: Экспорт email-списка

**As a** автор,
**I want to** скачать список подписчиков в CSV,
**So that** я владею своей аудиторией и могу мигрировать при необходимости.

**Priority:** Must | **Effort:** S

```gherkin
Feature: Email List Export

  Scenario: Export subscribers
    Given I have 500 subscribers
    When I click "Экспорт подписчиков" in settings
    Then I download a CSV file with columns: email, type (free/paid), subscribed_at
    And the file contains all 500 subscribers
    And the export is logged in audit trail
```

### US-008: Выплаты автору

**As a** автор с платными подписчиками,
**I want to** получать выплаты на свой бан��овский счёт,
**So that** я зарабатываю на контенте.

**Priority:** Must | **Effort:** L

```gherkin
Feature: Author Payouts

  Scenario: Monthly payout
    Given I earned 50,000 RUB this month (after platform fee)
    And I have verified bank details (Russian bank account)
    When payout date arrives (1st of month)
    Then 50,000 RUB is transferred to my bank account
    And I receive payout notification with breakdown

  Scenario: Minimum payout threshold
    Given I earned 500 RUB this month
    And minimum payout is 1,000 RUB
    Then payout is deferred to next month
    And balance carries over

  Scenario: Payout settings
    Given I am a new author
    When I open payout settings
    Then I can enter my bank account details (BIK + account number)
    And I must verify my identity (ИНН or passport)
```

---

## 3. User Stories (v1.0)

### US-009: Рекомендательная сеть

**As a** читатель,
**I want to** открывать новых авторов через рекомендации,
**So that** я нахожу интересный контент без по��ска.

**Priority:** Should | **Effort:** L

```gherkin
Feature: Recommendations

  Scenario: See recommendations after reading
    Given I finished reading an article by Author A
    Then I see "Читатели Author A также читают:" block
    And it shows 3-5 relevant authors from the platform

  Scenario: Author recommends another author
    Given I am Author A
    When I add Author B to my "Рекомендую" list
    Then Author B appears in recommendations on my publication page
```

### US-010: Реферальная программа

**As a** подписчик,
**I want to** пригласить друзей и получить бонусы,
**So that** я получаю эксклюзивный контент за рефералы.

**Priority:** Should | **Effort:** M

```gherkin
Feature: Referral Program

  Scenario: Get referral link
    Given I am subscribed to "Tech Digest"
    When I open my subscriber profile
    Then I see my unique referral link
    And I see a progress bar showing milestones (1, 5, 10 referrals)

  Scenario: Referral milestone reward
    Given I have referred 5 friends
    When the 5th friend confirms subscription
    Then I receive reward: 1 month free paid access
    And the author is notified about the milestone
```

### US-011: Микро-типпинг

**As a** читатель,
**I want to** отправить автору донат без оформления подписки,
**So that** я могу поддержать понравившуюся статью.

**Priority:** Should | **Effort:** M

```gherkin
Feature: Micro-tipping

  Scenario: Send a tip
    Given I am reading an article
    When I click "Поддержать автора"
    And I select 150 RUB
    And I pay via SBP
    Then 135 RUB (90%) goes to author
    And I see "Спасибо за поддержку!" confirmation
```

---

## 4. Non-Functional Requirements

### 4.1 Performance

| Метрика | Требование | Обоснование |
|---------|-----------|-------------|
| Page load (p50) | < 1.5s | UX, Yandex SEO Core Web Vitals |
| Page load (p99) | < 3s | Edge cases |
| API response (p50) | < 200ms | Real-time feel |
| API response (p99) | < 500ms | Under load |
| Email delivery | < 5 min после публикации | Timeliness |
| Email delivery rate | > 95% inbox | Deliverability |
| Concurrent users | 1,000 (MVP), 10,000 (v1.0) | Scaling plan |

### 4.2 Availability

| Метрика | Требование |
|---------|-----------|
| Uptime SLA | 99.5% (MVP), 99.9% (v1.0) |
| RTO | 4 hours (MVP), 1 hour (v1.0) |
| RPO | 1 hour (PostgreSQL WAL archiving) |
| Backup frequency | Daily full + hourly incremental |

### 4.3 Security

| Требование | Реализация |
|-----------|-----------|
| Authentication | Email + password (bcrypt), magic link |
| Authorization | RBAC: reader, author, admin |
| Encryption at rest | AES-256 для PII в БД |
| Encryption in transit | TLS 1.3 |
| PCI compliance | Делегировано CloudPayments (токенизация) |
| 152-ФЗ | Данные на серверах в РФ, consent management |
| Rate limiting | 100 req/min per IP, 1000 req/min per auth user |
| CSRF | SameSite cookies + CSRF tokens |
| XSS | CSP headers + sanitization |

### 4.4 Scalability

| Dimension | MVP | v1.0 (6 мес) | v2.0 (12 мес) |
|-----------|-----|-------------|--------------|
| Authors | 100 | 1,000 | 5,000 |
| Subscribers | 5,000 | 50,000 | 500,000 |
| Articles/day | 50 | 500 | 2,000 |
| Emails/day | 10,000 | 200,000 | 2,000,000 |
| Storage | 10 GB | 100 GB | 1 TB |

### 4.5 Compliance

| Требование | Детали |
|-----------|--------|
| 152-ФЗ | Хранение PD в РФ, согласие на обработку, право на удаление |
| Реестр блогеров | Уведомление авторов при 10K+ подписчиков, помощь в регистрации |
| Модерация | Удаление контента по требованию РКН за 24 часа |
| Финансовая отчётность | 54-ФЗ (онлайн-кассы) для B2C платежей |

---

## 5. Success Metrics

| Метрика | MVP Target | v1.0 Target | Метод измерения |
|---------|-----------|-------------|----------------|
| Authors (active, 1+ post/month) | 100 | 500 | DB query |
| Subscribers (total) | 5,000 | 50,000 | DB query |
| Paid subscribers | 200 | 5,000 | Payment system |
| MRR | ₽50K | ₽500K | Payment dashboard |
| Email open rate | > 40% | > 40% | ESP analytics |
| Author Day-30 retention | > 50% | > 60% | Cohort analysis |
| Reader Day-30 retention | > 30% | > 40% | Cohort analysis |
| Time to first post | < 15 min | < 10 min | Onboarding funnel |
| NPS (authors) | > 30 | > 50 | Survey |

---

*SPARC Phase 3: Specification. User stories в Gherkin, NFRs количественные, feature matrix с приоритетами.*
