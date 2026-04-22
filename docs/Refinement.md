# Refinement: Russian Newsletter Platform

**Дата:** 2026-04-22 | **Фаза:** SPARC Phase 6

---

## 1. Edge Cases Matrix

| # | Scenario | Input | Expected Behavior | Handling |
|---|----------|-------|-------------------|----------|
| 1 | Empty article publish | Title only, no content | Block publish | Validation: content_markdown.length > 0 |
| 2 | 100K subscribers email blast | Author publishes with 100K subs | Queue + batch (1000/batch) | Bull queue with 10 workers, ESP batch API |
| 3 | Concurrent paid subscribe | Two users pay same time | Both succeed | DB unique constraint on (subscriber_id, publication_id) |
| 4 | Payment webhook replay | CloudPayments sends same webhook 2x | Idempotent | Check processor_tx_id exists, skip if duplicate |
| 5 | Author deletes article after email sent | Delete published article | Article removed from web, emails already delivered | Soft delete, mark status="archived" |
| 6 | Subscriber email bounce 3x | Invalid email | Auto-deactivate | Mark email_valid=false, stop deliveries |
| 7 | Author changes price mid-billing | 500→700 RUB/mo | Existing subs keep old price until renewal | New price applies only to new subscriptions |
| 8 | Payout below minimum | Author earned 500 RUB (<1000 min) | Carry over to next month | Accumulate balance, pay when >= threshold |
| 9 | Slug collision after transliteration | Two authors: "Мой Блог" | Append number | "moy-blog", "moy-blog-2" |
| 10 | Image upload >10MB | Large file | Reject | Nginx client_max_body_size + API validation |
| 11 | XSS in article content | `<script>alert(1)</script>` | Stripped | DOMPurify sanitization on save + render |
| 12 | Rate limit on subscribe | Bot subscribes 1000x/min | Block after 10/min per IP | Rate limiter: 10 subscriptions/min per IP |
| 13 | Expired credit card on renewal | CloudPayments recurring fails | Grace period 3 days | Email notification, retry 2x, then expire |
| 14 | Author account deletion | GDPR/152-ФЗ right to delete | Delete user, anonymize content | Cascade: soft-delete user, anonymize articles or delete |
| 15 | Email with special characters | Subject: "Привет 🎉 мир" | Valid delivery | UTF-8 encoding, emoji in subject supported |
| 16 | Simultaneous article edits | Author opens editor on 2 tabs | Last save wins | Optimistic locking with updated_at check |
| 17 | Publication with 0 subscribers | Author publishes | Article published, no emails | Skip email queue, only web publish |
| 18 | SBP payment timeout | User doesn't complete QR | Payment expires in 10 min | Subscription stays "pending", cleanup after 30 min |

---

## 2. Testing Strategy

### 2.1 Unit Tests

**Coverage target:** > 80% for business logic modules

| Module | Priority | Key Tests |
|--------|----------|-----------|
| auth | Critical | Password hashing, JWT generation/validation, rate limiting |
| payments | Critical | Fee calculation, webhook signature verification, idempotency |
| subscriptions | Critical | Lifecycle transitions, duplicate prevention |
| articles | High | Markdown rendering, excerpt generation, visibility rules |
| email | High | Template rendering, batch splitting, bounce handling |
| analytics | Medium | Aggregation queries, rate calculations |
| recommendations | Medium | Co-subscription scoring, manual boost |

### 2.2 Integration Tests

| Test ID | Scenario | Components | Expected |
|---------|----------|-----------|----------|
| IT-001 | Full publish flow | API → DB → Queue → ESP mock | Article published, emails queued |
| IT-002 | Paid subscription | API → CloudPayments mock → DB | Subscription active after webhook |
| IT-003 | Payout calculation | DB (seeded payments) → Payout service | Correct amounts after fees |
| IT-004 | Referral milestone | API → Subscription → Referral check | Reward triggered at threshold |
| IT-005 | Email tracking | ESP webhook → API → DB | Delivery status updated |

### 2.3 E2E Tests

| Test ID | Journey | Steps | Pass Criteria |
|---------|---------|-------|---------------|
| E2E-001 | Author registration → first post | Register, setup publication, write article, publish | Article visible at public URL, accessible via SSR |
| E2E-002 | Reader subscribe → read paid content | Visit article, subscribe free, hit paywall, pay, read full | Full content visible after payment |
| E2E-003 | Author analytics | Publish article, generate opens (mock), check dashboard | Analytics show correct numbers |
| E2E-004 | Subscriber export | Author exports CSV | File downloads with correct subscriber data |

### 2.4 Performance Tests

| Test | Tool | Scenario | Target |
|------|------|----------|--------|
| Load test | k6 | 500 concurrent users reading articles | p99 < 500ms |
| Stress test | k6 | 2000 concurrent users | Graceful degradation, no crashes |
| Email throughput | Custom script | Queue 50K emails, measure drain time | < 30 min for 50K |
| DB query perf | pgbench + EXPLAIN | Analytics queries on 1M rows | < 200ms |

---

## 3. Test Cases (Gherkin)

### Feature: Article Publishing

```gherkin
Feature: Article Publishing

  Background:
    Given I am a registered author with publication "Tech Digest"

  Scenario: Publish free article
    Given I have a draft article "Новости недели"
    And I have 100 free subscribers
    When I publish the article with visibility "free"
    Then the article appears at /tech-digest/novosti-nedeli
    And 100 emails are queued for delivery
    And the article is indexable by search engines

  Scenario: Publish paid article
    Given I have 80 free and 20 paid subscribers
    When I publish with visibility "paid"
    Then 20 emails with full content are queued
    And 80 emails with teaser + paywall CTA are queued
    And the public page shows paywall after excerpt

  Scenario: Schedule article for future
    Given I have a draft article
    When I schedule it for "2026-04-25 10:00 MSK"
    Then the article status is "scheduled"
    And at "2026-04-25 10:00 MSK" it auto-publishes
    And emails are sent at that time
```

### Feature: Paid Subscription

```gherkin
Feature: Paid Subscription

  Background:
    Given author "Anna" has a publication with paid tier at 500 RUB/month

  Scenario: Subscribe via card
    Given I am a free subscriber of "Anna"
    When I click "Оформить подписку"
    And I select "Банковская карта"
    And payment succeeds via CloudPayments
    Then I am a paid subscriber
    And I can read all paid articles
    And Anna receives notification "Новый платный подписчик!"

  Scenario: Payment fails
    Given I try to subscribe
    When my card is declined
    Then I see "Оплата не прошла. Попробуйте другой способ"
    And I can try SBP or another card
    And no subscription is created

  Scenario: Cancel and re-subscribe
    Given I am a paid subscriber since April 1
    When I cancel on April 15
    Then I retain access until April 30
    And on May 1 my access expires
    When I re-subscribe on May 5
    Then a new billing cycle starts from May 5

  Scenario: Grace period on failed renewal
    Given my subscription renews on May 1
    When CloudPayments fails to charge my card
    Then I enter grace period (3 days)
    And I receive email "Обновите способ оплаты"
    And if I update card within 3 days, subscription continues
    And if I don't, subscription expires on May 4
```

### Feature: Email Delivery

```gherkin
Feature: Email Delivery

  Scenario: Track email open
    Given article "Post 1" was sent to subscriber@example.com
    When the subscriber opens the email
    Then EmailDelivery status updates to "opened"
    And article open count increments by 1
    And the open is counted only once per subscriber

  Scenario: Handle bounce
    Given subscriber@invalid.com has bounced 3 times
    When the 3rd bounce is received from ESP
    Then the subscriber email is marked as invalid
    And future articles are not sent to this address
    And the author sees "1 invalid email" in subscriber list

  Scenario: Handle spam complaint
    Given subscriber complains about email
    When ESP sends complaint webhook
    Then subscriber is auto-unsubscribed
    And delivery status is "complained"
```

---

## 4. Performance Optimizations

### Database

| Optimization | Where | Impact |
|-------------|-------|--------|
| Materialized views | Analytics aggregates (daily/weekly/monthly) | 10x faster dashboard queries |
| Partial indexes | `WHERE status = 'published'` on articles | Smaller index, faster reads |
| Connection pooling | PgBouncer (transaction mode) | Handle 500+ connections on 100 pool |
| Partition by month | EmailDelivery table | Fast cleanup, query performance |
| BRIN index | EmailDelivery.created_at | Efficient range scans on time-series |

### Application

| Optimization | Where | Impact |
|-------------|-------|--------|
| Redis caching | Publication pages (TTL 5 min) | Reduce DB reads 90%+ for popular pages |
| CDN for static assets | Images, CSS, JS | Reduce server load, faster global delivery |
| Email batch API | Resend batch (1000/request) | 100x fewer API calls |
| Lazy loading | Article images | Faster initial page load |
| ISR (Incremental Static Regeneration) | Next.js for publication pages | Static-like speed with dynamic data |
| gzip/brotli | Nginx compression | 60-80% smaller responses |

### Email Delivery

| Optimization | Impact |
|-------------|--------|
| Dedicated IP + warm-up (2 weeks) | Higher inbox placement |
| SPF + DKIM + DMARC | Required for deliverability |
| Feedback loop registration (mail.ru, yandex.ru) | Complaint handling |
| Unsubscribe header (RFC 8058) | One-click unsubscribe, lower spam complaints |
| Engagement-based throttling | Send to engaged users first, expand gradually |

---

## 5. Security Hardening

| Measure | Implementation | Priority |
|---------|---------------|----------|
| Input validation | class-validator on all DTOs, DOMPurify for HTML | Critical |
| Rate limiting per route | Auth: 5/min, Subscribe: 10/min, API: 100/min | Critical |
| Webhook signature verification | HMAC-SHA256 for each payment processor | Critical |
| SQL injection prevention | Prisma ORM (parameterized queries only) | Critical |
| CORS | Whitelist: own domain only | High |
| Helmet.js | Security headers (X-Frame-Options, CSP, etc.) | High |
| Dependency audit | `npm audit` in CI, Snyk/Dependabot | High |
| Secrets management | Environment variables, never in code/git | Critical |
| Audit log | Log auth events, payment events, admin actions | Medium |
| 2FA for authors | TOTP (optional, recommended for top authors) | Low (v1.0) |

---

## 6. Accessibility (a11y)

| Requirement | Implementation |
|-------------|---------------|
| WCAG 2.1 Level AA | Target for public pages |
| Keyboard navigation | All interactive elements focusable, tab order logical |
| Screen reader | Semantic HTML, ARIA labels where needed |
| Color contrast | 4.5:1 minimum (checked via Lighthouse) |
| Focus indicators | Visible focus rings on all interactive elements |
| Alt text | Required for all uploaded images |
| Responsive | Mobile-first, readable on 320px+ screens |

---

## 7. Technical Debt Items

| # | Item | Severity | When to Address |
|---|------|----------|----------------|
| 1 | Email templates hardcoded in code | Medium | v1.0 — move to template engine |
| 2 | No full-text search (Yandex SEO only) | Low | v1.5 — add PostgreSQL tsvector or Meilisearch |
| 3 | Single VPS = SPOF | High | v1.0 — add db replica, multi-VPS |
| 4 | No A/B testing framework | Low | v1.5 — add feature flags + experiment tracking |
| 5 | Analytics not real-time (materialized views) | Low | v2.0 — consider ClickHouse for analytics |
| 6 | No image optimization pipeline | Medium | v1.0 — add Sharp for resize/compress on upload |

---

*SPARC Phase 6: Refinement. 18 edge cases, 4-tier testing strategy, 10 Gherkin scenarios, performance + security optimizations.*
