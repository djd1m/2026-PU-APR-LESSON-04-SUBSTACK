# Pseudocode: Russian Newsletter Platform

**Дата:** 2026-04-22 | **Фаза:** SPARC Phase 4

---

## 1. Data Structures

### Core Entities

```
type User = {
  id: UUID
  email: string (unique, indexed)
  password_hash: string (bcrypt, 12 rounds)
  role: enum("reader", "author", "admin")
  name: string
  avatar_url: string | null
  email_verified: boolean
  created_at: timestamp
  updated_at: timestamp
}

type Publication = {
  id: UUID
  author_id: UUID -> User.id
  name: string
  slug: string (unique, indexed)
  description: text
  avatar_url: string | null
  custom_domain: string | null
  paid_enabled: boolean (default: false)
  paid_price_monthly: integer (kopecks, e.g. 50000 = 500 RUB)
  paid_price_yearly: integer (kopecks) | null
  created_at: timestamp
}

type Article = {
  id: UUID
  publication_id: UUID -> Publication.id
  title: string
  slug: string (unique per publication)
  content_markdown: text
  content_html: text (rendered)
  excerpt: text (auto-generated, first 300 chars)
  cover_image_url: string | null
  visibility: enum("free", "paid")
  status: enum("draft", "scheduled", "published")
  scheduled_at: timestamp | null
  published_at: timestamp | null
  email_sent: boolean (default: false)
  seo_title: string | null
  seo_description: string | null
  created_at: timestamp
  updated_at: timestamp
}

type Subscription = {
  id: UUID
  subscriber_id: UUID -> User.id
  publication_id: UUID -> Publication.id
  type: enum("free", "paid")
  status: enum("active", "cancelled", "expired", "grace_period")
  payment_id: string | null (CloudPayments subscription ID)
  started_at: timestamp
  expires_at: timestamp | null
  cancelled_at: timestamp | null
  created_at: timestamp
}

type Payment = {
  id: UUID
  subscription_id: UUID -> Subscription.id
  amount: integer (kopecks)
  currency: string (default: "RUB")
  platform_fee: integer (kopecks, 10% of amount)
  processor_fee: integer (kopecks)
  author_payout: integer (kopecks, amount - platform_fee - processor_fee)
  processor: enum("cloudpayments", "sbp", "yookassa")
  processor_tx_id: string
  status: enum("pending", "completed", "failed", "refunded")
  paid_at: timestamp | null
  created_at: timestamp
}

type Payout = {
  id: UUID
  author_id: UUID -> User.id
  amount: integer (kopecks)
  status: enum("pending", "processing", "completed", "failed")
  bank_account: string (encrypted)
  period_start: date
  period_end: date
  created_at: timestamp
  completed_at: timestamp | null
}

type EmailDelivery = {
  id: UUID
  article_id: UUID -> Article.id
  subscriber_id: UUID -> User.id
  status: enum("queued", "sent", "delivered", "opened", "clicked", "bounced", "complained")
  sent_at: timestamp | null
  opened_at: timestamp | null
  clicked_at: timestamp | null
  created_at: timestamp
}

type Recommendation = {
  id: UUID
  from_publication_id: UUID -> Publication.id
  to_publication_id: UUID -> Publication.id
  created_at: timestamp
}

type Referral = {
  id: UUID
  referrer_id: UUID -> User.id
  referred_id: UUID -> User.id
  publication_id: UUID -> Publication.id
  milestone_reached: integer (default: 0)
  reward_granted: boolean (default: false)
  created_at: timestamp
}

type Tip = {
  id: UUID
  from_user_id: UUID -> User.id
  to_publication_id: UUID -> Publication.id
  article_id: UUID -> Article.id | null
  amount: integer (kopecks)
  platform_fee: integer (kopecks)
  processor: enum("sbp", "cloudpayments", "yookassa")
  processor_tx_id: string
  status: enum("pending", "completed", "failed")
  created_at: timestamp
}
```

### Indexes

```
INDEX idx_articles_pub_published ON Article(publication_id, published_at DESC)
  WHERE status = 'published'

INDEX idx_subscriptions_pub_active ON Subscription(publication_id, type)
  WHERE status = 'active'

INDEX idx_email_delivery_article ON EmailDelivery(article_id, status)

INDEX idx_articles_seo ON Article(publication_id, slug)
  WHERE status = 'published'

UNIQUE INDEX idx_sub_unique ON Subscription(subscriber_id, publication_id)
  WHERE status IN ('active', 'grace_period')
```

---

## 2. Core Algorithms

### Algorithm: Publish Article + Email Delivery

```
FUNCTION publishArticle(articleId, authorId):
  INPUT: articleId (UUID), authorId (UUID)
  OUTPUT: { success: boolean, emailsQueued: integer }

  1. article = DB.findById(Article, articleId)
  2. IF article IS NULL THEN RETURN { success: false, error: "NOT_FOUND" }
  3. IF article.publication.author_id != authorId THEN RETURN { success: false, error: "FORBIDDEN" }

  4. BEGIN TRANSACTION:
    5. article.status = "published"
    6. article.published_at = NOW()
    7. article.content_html = renderMarkdown(article.content_markdown)
    8. article.excerpt = generateExcerpt(article.content_html, 300)
    9. DB.save(article)
  COMMIT

  10. subscribers = DB.find(Subscription,
        WHERE publication_id = article.publication_id
        AND status = "active")

  11. IF article.visibility == "paid":
        paidSubscribers = subscribers.filter(s => s.type == "paid")
        freeSubscribers = subscribers.filter(s => s.type == "free")

        // Full article to paid subscribers
        FOR EACH sub IN paidSubscribers:
          EmailQueue.enqueue({
            to: sub.subscriber.email,
            subject: article.title,
            body: renderFullEmail(article),
            article_id: articleId,
            subscriber_id: sub.subscriber_id
          })

        // Teaser to free subscribers
        FOR EACH sub IN freeSubscribers:
          EmailQueue.enqueue({
            to: sub.subscriber.email,
            subject: article.title,
            body: renderTeaserEmail(article, paywall_cta=true),
            article_id: articleId,
            subscriber_id: sub.subscriber_id
          })
      ELSE:
        FOR EACH sub IN subscribers:
          EmailQueue.enqueue({
            to: sub.subscriber.email,
            subject: article.title,
            body: renderFullEmail(article),
            article_id: articleId,
            subscriber_id: sub.subscriber_id
          })

  12. article.email_sent = true
  13. DB.save(article)
  14. RETURN { success: true, emailsQueued: subscribers.length }

COMPLEXITY: O(n) where n = subscriber count
BOTTLENECK: Email queue throughput — batch via ESP API (1000/request)
```

### Algorithm: Process Paid Subscription

```
FUNCTION createPaidSubscription(subscriberId, publicationId, processor):
  INPUT: subscriberId (UUID), publicationId (UUID), processor (string)
  OUTPUT: { success: boolean, subscription: Subscription, paymentUrl: string }

  1. publication = DB.findById(Publication, publicationId)
  2. IF NOT publication.paid_enabled THEN RETURN error("PAID_NOT_ENABLED")

  3. existing = DB.find(Subscription,
      WHERE subscriber_id = subscriberId
      AND publication_id = publicationId
      AND status IN ("active", "grace_period"))
  4. IF existing THEN RETURN error("ALREADY_SUBSCRIBED")

  5. amount = publication.paid_price_monthly
  6. platformFee = FLOOR(amount * 0.10)  // 10%

  7. SWITCH processor:
      CASE "cloudpayments":
        result = CloudPayments.createRecurring({
          amount: amount / 100,  // kopecks to rubles
          currency: "RUB",
          accountId: subscriberId,
          description: "Подписка на " + publication.name,
          interval: "Month",
          period: 1
        })
        paymentUrl = result.confirmationUrl

      CASE "sbp":
        result = SBPGateway.createPayment({
          amount: amount,
          description: "Подписка на " + publication.name,
          callbackUrl: BASE_URL + "/api/payments/sbp/callback"
        })
        paymentUrl = result.qrCodeUrl

      CASE "yookassa":
        result = YooKassa.createPayment({
          amount: { value: amount / 100, currency: "RUB" },
          confirmation: { type: "redirect", return_url: BASE_URL + "/subscribe/success" },
          capture: true,
          save_payment_method: true,
          description: "Подписка на " + publication.name
        })
        paymentUrl = result.confirmation.confirmationUrl

  8. subscription = DB.create(Subscription, {
      subscriber_id: subscriberId,
      publication_id: publicationId,
      type: "paid",
      status: "pending",  // becomes "active" on payment callback
      payment_id: result.subscriptionId
  })

  9. RETURN { success: true, subscription, paymentUrl }
```

### Algorithm: Payment Webhook Handler

```
FUNCTION handlePaymentWebhook(processorName, payload):
  INPUT: processorName (string), payload (object)
  OUTPUT: HTTP 200

  1. IF NOT verifyWebhookSignature(processorName, payload):
      LOG.warn("Invalid webhook signature", { processor: processorName })
      RETURN HTTP 400

  2. SWITCH processorName:
      CASE "cloudpayments":
        txId = payload.TransactionId
        status = payload.Status  // "Completed" | "Declined"
        amount = payload.Amount * 100  // rubles to kopecks
        accountId = payload.AccountId

      CASE "sbp":
        txId = payload.operationId
        status = payload.operationState  // "SUCCESS" | "FAIL"
        amount = payload.amount
        accountId = payload.metadata.subscriberId

      CASE "yookassa":
        txId = payload.id
        status = payload.status  // "succeeded" | "canceled"
        amount = payload.amount.value * 100
        accountId = payload.metadata.subscriberId

  3. subscription = DB.find(Subscription, WHERE payment_id MATCHES txId OR accountId)
  4. IF subscription IS NULL THEN LOG.error("Unknown payment") AND RETURN HTTP 200

  5. IF status == SUCCESS:
      BEGIN TRANSACTION:
        subscription.status = "active"
        subscription.expires_at = NOW() + 1 MONTH
        DB.save(subscription)

        payment = DB.create(Payment, {
          subscription_id: subscription.id,
          amount: amount,
          platform_fee: FLOOR(amount * 0.10),
          processor_fee: calculateProcessorFee(processorName, amount),
          author_payout: amount - FLOOR(amount * 0.10) - calculateProcessorFee(processorName, amount),
          processor: processorName,
          processor_tx_id: txId,
          status: "completed",
          paid_at: NOW()
        })
      COMMIT

      // Notify author
      NotificationService.send(subscription.publication.author_id,
        "Новый платный подписчик! +" + (amount / 100) + " ₽/мес")

  6. ELSE IF status == FAILED:
      subscription.status = "grace_period"
      subscription.expires_at = NOW() + 3 DAYS
      DB.save(subscription)
      EmailService.send(subscription.subscriber.email, "payment_failed_retry")

  7. RETURN HTTP 200
```

### Algorithm: Recommendation Engine

```
FUNCTION getRecommendations(publicationId, limit=5):
  INPUT: publicationId (UUID), limit (integer)
  OUTPUT: Publication[]

  // Strategy: collaborative filtering based on co-subscriptions
  1. subscribers = DB.find(Subscription,
      WHERE publication_id = publicationId AND status = "active")
      .map(s => s.subscriber_id)

  2. coSubscriptions = DB.query("""
      SELECT s2.publication_id, COUNT(*) as overlap
      FROM Subscription s2
      WHERE s2.subscriber_id IN (:subscribers)
        AND s2.publication_id != :publicationId
        AND s2.status = 'active'
      GROUP BY s2.publication_id
      ORDER BY overlap DESC
      LIMIT :limit * 2
  """, { subscribers, publicationId, limit })

  3. // Boost manually recommended publications
  manualRecs = DB.find(Recommendation,
      WHERE from_publication_id = publicationId)
      .map(r => r.to_publication_id)

  4. scored = coSubscriptions.map(cs => ({
      publication_id: cs.publication_id,
      score: cs.overlap + (manualRecs.includes(cs.publication_id) ? 100 : 0)
  }))

  5. SORT scored BY score DESC
  6. RETURN scored.slice(0, limit).map(s => DB.findById(Publication, s.publication_id))

COMPLEXITY: O(n * m) where n = subscribers, m = their subscriptions
OPTIMIZATION: Pre-compute co-subscription matrix nightly via cron job
```

### Algorithm: Author Payout Calculation

```
FUNCTION calculateMonthlyPayout(authorId, periodStart, periodEnd):
  INPUT: authorId (UUID), periodStart (date), periodEnd (date)
  OUTPUT: { totalRevenue, platformFee, processorFees, payout }

  1. payments = DB.find(Payment,
      WHERE subscription.publication.author_id = authorId
        AND paid_at BETWEEN periodStart AND periodEnd
        AND status = "completed")

  2. tips = DB.find(Tip,
      WHERE to_publication.author_id = authorId
        AND created_at BETWEEN periodStart AND periodEnd
        AND status = "completed")

  3. totalRevenue = SUM(payments.amount) + SUM(tips.amount)
  4. platformFee = SUM(payments.platform_fee) + SUM(tips.platform_fee)
  5. processorFees = SUM(payments.processor_fee) + SUM(tips.processor_fee if applicable)
  6. payout = totalRevenue - platformFee - processorFees

  7. IF payout < MINIMUM_PAYOUT (100000 kopecks = 1000 RUB):
      RETURN { totalRevenue, platformFee, processorFees, payout, status: "below_minimum" }

  8. payoutRecord = DB.create(Payout, {
      author_id: authorId,
      amount: payout,
      status: "pending",
      period_start: periodStart,
      period_end: periodEnd
  })

  9. RETURN { totalRevenue, platformFee, processorFees, payout, payoutId: payoutRecord.id }
```

### Algorithm: Email Open/Click Tracking

```
FUNCTION trackEmailEvent(deliveryId, eventType, metadata):
  INPUT: deliveryId (UUID), eventType (string), metadata (object)
  OUTPUT: void

  1. delivery = DB.findById(EmailDelivery, deliveryId)
  2. IF delivery IS NULL THEN RETURN

  3. SWITCH eventType:
      CASE "delivered":
        delivery.status = "delivered"
      CASE "opened":
        IF delivery.opened_at IS NULL:  // count only first open
          delivery.status = "opened"
          delivery.opened_at = NOW()
          // Increment article open counter (async)
          StatsQueue.enqueue({ type: "open", article_id: delivery.article_id })
      CASE "clicked":
        delivery.status = "clicked"
        delivery.clicked_at = NOW()
        StatsQueue.enqueue({ type: "click", article_id: delivery.article_id, url: metadata.url })
      CASE "bounced":
        delivery.status = "bounced"
        // Mark subscriber email as invalid after 3 bounces
        bounceCount = DB.count(EmailDelivery,
          WHERE subscriber_id = delivery.subscriber_id AND status = "bounced")
        IF bounceCount >= 3:
          markEmailInvalid(delivery.subscriber_id)
      CASE "complained":
        delivery.status = "complained"
        // Auto-unsubscribe on complaint
        unsubscribe(delivery.subscriber_id, delivery.article.publication_id)

  4. DB.save(delivery)
```

---

## 3. API Contracts

### Auth

```
POST /api/auth/register
  Request:  { email: string, password: string, name: string }
  Response: 201 { user: { id, email, name }, message: "Verification email sent" }
  Errors:   400 { error: "INVALID_EMAIL" }
            409 { error: "EMAIL_EXISTS" }

POST /api/auth/login
  Request:  { email: string, password: string }
  Response: 200 { token: JWT, refreshToken: string, user: { id, email, name, role } }
  Errors:   401 { error: "INVALID_CREDENTIALS" }
            423 { error: "ACCOUNT_LOCKED" }

POST /api/auth/refresh
  Request:  { refreshToken: string }
  Response: 200 { token: JWT, refreshToken: string }
```

### Publications

```
POST /api/publications
  Auth:     Required (author)
  Request:  { name: string, slug: string, description: string }
  Response: 201 { publication: Publication }

GET /api/publications/:slug
  Auth:     Optional
  Response: 200 { publication: Publication, subscriberCount: number, articleCount: number }

PATCH /api/publications/:id
  Auth:     Required (owner)
  Request:  { name?, description?, paid_enabled?, paid_price_monthly? }
  Response: 200 { publication: Publication }
```

### Articles

```
POST /api/publications/:pubId/articles
  Auth:     Required (owner)
  Request:  { title: string, content_markdown: string, visibility: "free"|"paid", status: "draft"|"published" }
  Response: 201 { article: Article }

GET /api/publications/:slug/articles
  Auth:     Optional (paid content gated)
  Query:    ?page=1&limit=20
  Response: 200 { articles: Article[], total: number, page: number }
  Note:     Paid articles return excerpt only unless subscriber has active paid subscription

GET /api/publications/:slug/articles/:articleSlug
  Auth:     Optional
  Response: 200 { article: Article }
  Note:     If visibility="paid" and user is not paid subscriber:
            content_html = excerpt + paywall CTA

PATCH /api/articles/:id
  Auth:     Required (owner)
  Request:  { title?, content_markdown?, visibility?, status? }
  Response: 200 { article: Article }

POST /api/articles/:id/publish
  Auth:     Required (owner)
  Response: 200 { article: Article, emailsQueued: number }
```

### Subscriptions

```
POST /api/publications/:pubId/subscribe
  Auth:     Required
  Request:  { type: "free" }
  Response: 201 { subscription: Subscription }

POST /api/publications/:pubId/subscribe/paid
  Auth:     Required
  Request:  { processor: "cloudpayments"|"sbp"|"yookassa" }
  Response: 200 { subscription: Subscription, paymentUrl: string }

DELETE /api/subscriptions/:id
  Auth:     Required (subscriber)
  Response: 200 { subscription: Subscription (status=cancelled) }

GET /api/me/subscriptions
  Auth:     Required
  Response: 200 { subscriptions: Subscription[] }
```

### Payments & Payouts

```
POST /api/webhooks/cloudpayments
  Auth:     Webhook signature verification
  Request:  CloudPayments webhook payload
  Response: 200

POST /api/webhooks/sbp
  Auth:     Webhook signature verification
  Response: 200

POST /api/webhooks/yookassa
  Auth:     Webhook signature verification
  Response: 200

GET /api/author/payouts
  Auth:     Required (author)
  Response: 200 { payouts: Payout[], pendingBalance: number }

GET /api/author/revenue
  Auth:     Required (author)
  Query:    ?from=2026-01-01&to=2026-04-22
  Response: 200 { totalRevenue, platformFee, processorFees, netPayout, byMonth: [...] }
```

### Analytics

```
GET /api/author/analytics/overview
  Auth:     Required (author)
  Response: 200 {
    totalSubscribers: number,
    paidSubscribers: number,
    mrr: number (kopecks),
    openRate: number (0-1),
    growth: { last7d: number, last30d: number }
  }

GET /api/author/analytics/articles/:id
  Auth:     Required (owner)
  Response: 200 {
    deliveries: number,
    opens: number,
    clicks: number,
    openRate: number,
    clickRate: number,
    newSubscribers: number
  }
```

### Subscribers Export

```
GET /api/author/subscribers/export
  Auth:     Required (author)
  Response: 200 (text/csv)
    email,type,subscribed_at
    reader@example.com,free,2026-03-15
    paid@example.com,paid,2026-04-01
```

### Recommendations

```
GET /api/publications/:pubId/recommendations
  Auth:     Optional
  Query:    ?limit=5
  Response: 200 { recommendations: Publication[] }
```

### Tips

```
POST /api/publications/:pubId/tip
  Auth:     Required
  Request:  { amount: number (kopecks), processor: "sbp"|"cloudpayments", articleId?: UUID }
  Response: 200 { paymentUrl: string }
```

---

## 4. State Transitions

### Article Lifecycle

```
  [draft] --publish--> [published]
  [draft] --schedule--> [scheduled] --time arrives--> [published]
  [published] --unpublish--> [draft]
  [scheduled] --cancel--> [draft]
```

### Subscription Lifecycle

```
  [–] --subscribe free--> [active (free)]
  [–] --subscribe paid--> [pending] --payment success--> [active (paid)]
  [pending] --payment failed--> [–]
  [active (paid)] --payment failed--> [grace_period (3d)]
  [grace_period] --payment retry success--> [active (paid)]
  [grace_period] --3 days expire--> [expired]
  [active] --cancel--> [cancelled] (access until period end)
  [cancelled] --period ends--> [expired]
  [active (free)] --unsubscribe--> [–]
```

### Payment Lifecycle

```
  [pending] --webhook success--> [completed]
  [pending] --webhook failed--> [failed]
  [completed] --refund request--> [refunded]
```

---

## 5. Error Handling Strategy

| Code | HTTP | Trigger | User Message | System Action |
|------|:----:|---------|-------------|---------------|
| AUTH_001 | 401 | Invalid credentials | "Неверный email или пароль" | Log attempt, increment counter |
| AUTH_002 | 423 | Account locked (5 fails) | "Аккаунт временно заблокирован (15 мин)" | Lock 15 min, alert if pattern |
| AUTH_003 | 403 | Email not verified | "Подтвердите email" | Resend verification |
| PAY_001 | 402 | Payment failed | "Оплата не прошла" | Log, suggest alternative |
| PAY_002 | 400 | Invalid payment amount | "Некорректная сумма" | Reject |
| PAY_003 | 503 | Processor unavailable | "Платёжная система недоступна, попробуйте позже" | Switch to fallback processor |
| SUB_001 | 409 | Already subscribed | "Вы уже подписаны" | Return existing subscription |
| SUB_002 | 404 | Publication not found | "Публикация не найдена" | — |
| PUB_001 | 409 | Slug taken | "Этот адрес уже занят" | Suggest alternative |
| EMAIL_001 | 500 | ESP delivery failure | (internal) | Retry 3x, alert ops |
| RATE_001 | 429 | Rate limit exceeded | "Слишком много запросов" | Block 1 min |

---

*SPARC Phase 4: Pseudocode. 8 entities, 6 core algorithms, 20+ API endpoints, state machines, error codes.*
