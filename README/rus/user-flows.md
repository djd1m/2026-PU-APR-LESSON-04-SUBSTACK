# Пользовательские сценарии SubStack RU

## Сценарий 1: Автор — регистрация и первая публикация

**Участники:** Новый автор, Backend API, База данных, Resend (email)

```mermaid
sequenceDiagram
    actor Author as Автор
    participant FE as Frontend (Next.js :3011)
    participant API as Backend API (NestJS :3010)
    participant DB as PostgreSQL (:5437)
    participant Queue as Bull Queue (Redis :6380)
    participant Email as Resend API

    Author->>FE: Открывает /register
    Author->>FE: Заполняет форму (email, пароль, имя)
    FE->>API: POST /api/auth/register
    API->>DB: INSERT users (bcrypt 12 rounds)
    DB-->>API: user created {id, email, role: "reader"}
    API-->>FE: {access_token, refresh_token, user}
    FE->>FE: Сохраняет токены в Zustand store
    FE->>Author: Редирект → /dashboard

    Note over Author,FE: Автор создаёт публикацию

    Author->>FE: Переходит в Настройки
    Author->>FE: Заполняет форму публикации (название, описание, slug)
    FE->>API: POST /api/publications {title, description, slug}
    API->>DB: INSERT publications (author_id = user.id)
    DB-->>API: publication created
    API->>DB: UPDATE users SET role = "author"
    API-->>FE: {publication}
    FE->>Author: Показывает страницу публикации

    Note over Author,FE: Автор пишет первую статью

    Author->>FE: Переходит в Редактор
    Author->>FE: Пишет статью (TipTap)
    FE->>API: POST /api/articles (draft)
    API->>DB: INSERT articles {title, content, visibility, status: "draft"}
    Author->>FE: Нажимает "Опубликовать"
    FE->>API: PATCH /api/articles/:id {status: "published", published_at: now()}
    API->>DB: UPDATE articles SET published_at = NOW()
    API->>Queue: Добавляет job "send-article-email"
    Queue->>API: Выполняет job: SELECT подписчики публикации
    API->>Email: POST /emails (Resend API) — уведомление подписчикам
    Email-->>API: {id: "email-id", sent: true}
    API->>DB: INSERT email_deliveries {status: "sent"}
    FE->>Author: Статья опубликована!
```

---

## Сценарий 2: Читатель — подписка и оплата

**Участники:** Читатель, Frontend, Backend API, CloudPayments, PostgreSQL

```mermaid
sequenceDiagram
    actor Reader as Читатель
    participant FE as Frontend (Next.js :3011)
    participant API as Backend API (NestJS :3010)
    participant DB as PostgreSQL (:5437)
    participant CP as CloudPayments
    participant Email as Resend API

    Reader->>FE: Открывает /:publication-slug
    FE->>API: GET /api/publications/:slug
    API->>DB: SELECT publication + articles (published)
    DB-->>API: {publication, articles[]}
    API-->>FE: Данные публикации
    FE->>Reader: Показывает страницу публикации

    Note over Reader,FE: Бесплатная подписка

    Reader->>FE: Вводит email в форму подписки
    FE->>API: POST /api/subscriptions {email, publication_id, type: "free"}
    API->>DB: INSERT subscriptions {type: "free", status: "active"}
    API->>Email: Отправляет welcome email
    API-->>FE: {subscribed: true}
    FE->>Reader: "Вы подписаны! Проверьте почту"

    Note over Reader,FE: Читатель натыкается на платный контент

    Reader->>FE: Открывает /:slug/:article-slug (платная статья)
    FE->>API: GET /api/articles/:slug
    API->>DB: SELECT article + проверка подписки пользователя
    DB-->>API: {article, user_subscription: {type: "free"}}
    API-->>FE: {article: {content: preview_only, paywall: true}}
    FE->>Reader: Показывает превью + paywall блок

    Note over Reader,FE: Оформление платной подписки

    Reader->>FE: Нажимает "Поддержать автора — 500 ₽/мес"
    FE->>API: POST /api/payments/create-session {publication_id}
    API->>DB: SELECT publication {price_monthly}
    API->>CP: POST /orders (создание платёжной сессии)
    CP-->>API: {payment_url, order_id}
    API-->>FE: {payment_url}
    FE->>Reader: Редирект на CloudPayments виджет

    Reader->>CP: Вводит данные карты (или СБП QR)
    CP->>CP: Обрабатывает платёж
    CP->>API: POST /api/payments/webhook/cloudpayments
    Note over API: HMAC-SHA256 верификация X-Content-HMAC
    API->>DB: INSERT payments {status: "completed", amount: 50000}
    API->>DB: UPDATE subscriptions SET type="paid", paid_until=+30days
    API->>Email: Отправляет подтверждение оплаты
    API-->>CP: 200 OK
    CP->>Reader: Редирект на success URL

    Reader->>FE: Возвращается на статью
    FE->>API: GET /api/articles/:slug (с JWT токеном)
    API->>DB: SELECT article + проверка paid подписки
    DB-->>API: {article: {content: full_content}}
    API-->>FE: Полный текст статьи
    FE->>Reader: Читает полную статью
```

---

## Сценарий 3: Выплата автору

**Участники:** Автор, Admin, Backend API, PostgreSQL

```mermaid
sequenceDiagram
    actor Author as Автор
    actor Admin as Администратор
    participant API as Backend API (NestJS :3010)
    participant DB as PostgreSQL (:5437)
    participant Queue as Bull Queue (Redis :6380)

    Note over DB: 1-е число месяца — автоматический расчёт

    Queue->>API: Cron job "monthly-payout-calculation"
    API->>DB: SELECT SUM(payments.amount) WHERE month = current_month GROUP BY author
    DB-->>API: [{author_id, gross_amount, platform_fee_10pct, net_amount}]
    API->>DB: INSERT payouts {author_id, amount: net_amount, status: "pending"}

    Note over Author,API: Автор проверяет баланс

    Author->>API: GET /api/payouts/balance
    API->>DB: SELECT payout WHERE author_id AND status="pending"
    DB-->>API: {balance: 4500, min_payout: 1000, eligible: true}
    API-->>Author: {balance: "4500 ₽", next_payout: "2026-05-01"}

    Note over Author,API: Автор добавляет реквизиты (если не добавлены)

    Author->>API: POST /api/payouts/bank-details {ФИО, ИНН, счёт, БИК}
    API->>DB: UPDATE payouts SET bank_details = {...}
    API-->>Author: {saved: true}

    Note over Admin,DB: Ручная выплата (на текущем этапе)

    Admin->>API: GET /api/admin/payouts?status=pending
    API->>DB: SELECT payouts WHERE status="pending"
    DB-->>API: [{author, amount, bank_details}]
    API-->>Admin: Список ожидающих выплат

    Admin->>Admin: Выполняет банковский перевод
    Admin->>API: PATCH /api/admin/payouts/:id {status: "completed", paid_at: now()}
    API->>DB: UPDATE payouts SET status="completed", paid_at=NOW()
    API->>Queue: Job "send-payout-notification"
    Queue->>API: Отправляет email автору о выплате
    API-->>Admin: {updated: true}
```

---

## Сценарий 4: Администратор — мониторинг и модерация

**Участники:** Администратор, Backend API, PostgreSQL, Redis

```mermaid
sequenceDiagram
    actor Admin as Администратор
    participant API as Backend API (NestJS :3010)
    participant DB as PostgreSQL (:5437)
    participant Redis as Redis (:6380)

    Note over Admin,API: Ежедневный мониторинг

    Admin->>API: GET /api/health
    API->>DB: SELECT 1 (connectivity check)
    API->>Redis: PING
    DB-->>API: OK
    Redis-->>API: PONG
    API-->>Admin: {status: "ok", database: "ok", redis: "ok"}

    Note over Admin,API: Проверка метрик платформы

    Admin->>API: GET /api/admin/stats
    API->>DB: SELECT COUNT users, publications, articles, subscriptions, payments
    DB-->>API: {users: 342, authors: 28, articles: 156, active_subscriptions: 89, revenue_month: 44500}
    API-->>Admin: Статистика платформы

    Note over Admin,API: Жалоба на статью — модерация

    Admin->>API: GET /api/admin/articles?reported=true
    API->>DB: SELECT articles WHERE reported = true AND deleted_at IS NULL
    DB-->>API: [{article_id, title, author_email, report_reason}]
    API-->>Admin: Список статей на модерацию

    Admin->>Admin: Проверяет статью (открывает /:slug/:article)
    Admin->>API: DELETE /api/admin/articles/:id (мягкое удаление)
    API->>DB: UPDATE articles SET deleted_at = NOW() WHERE id = :id
    DB-->>API: OK
    API-->>Admin: {deleted: true}

    Note over Admin,API: Блокировка пользователя

    Admin->>API: GET /api/admin/users?email=bad-actor@example.com
    API->>DB: SELECT user WHERE email = 'bad-actor@example.com'
    DB-->>API: {user}
    API-->>Admin: Данные пользователя

    Admin->>API: PATCH /api/admin/users/:id {action: "ban"}
    API->>DB: UPDATE users SET deleted_at = NOW() WHERE id = :id
    API->>Redis: DEL refresh:user-id:* (инвалидация всех сессий)
    DB-->>API: OK
    API-->>Admin: {banned: true}

    Note over Admin,API: Проверка очереди email

    Admin->>Redis: LLEN bull:email:wait (через redis-cli)
    Redis-->>Admin: 0 (очередь пуста — OK)

    Admin->>API: GET /api/admin/email-deliveries?status=failed&hours=24
    API->>DB: SELECT email_deliveries WHERE status='failed' AND created_at > NOW()-24h
    DB-->>API: [{id, email_type, error_message, created_at}]
    API-->>Admin: Список неудачных отправок (если есть — расследовать)
```

---

## Сценарий 5: Работа редактора (автосохранение)

```mermaid
sequenceDiagram
    actor Author as Автор
    participant Editor as TipTap Editor (браузер)
    participant API as Backend API (:3010)
    participant DB as PostgreSQL (:5437)

    Author->>Editor: Открывает /dashboard/articles/new
    Editor->>API: POST /api/articles {title: "", content: "", status: "draft"}
    API->>DB: INSERT articles {status: "draft"}
    DB-->>API: {id: "article-uuid"}
    API-->>Editor: {id: "article-uuid"}

    loop Каждые 30 секунд при наличии изменений
        Editor->>API: PATCH /api/articles/article-uuid {title, content}
        API->>DB: UPDATE articles SET title=..., content=..., updated_at=NOW()
        DB-->>API: OK
        API-->>Editor: {saved_at: "14:32:05"}
        Editor->>Author: Показывает "Сохранено 2 мин назад"
    end

    Author->>Editor: Нажимает "Опубликовать"
    Editor->>API: PATCH /api/articles/article-uuid {status: "published", visibility: "free"}
    API->>DB: UPDATE articles SET status="published", published_at=NOW()
    API->>DB: SELECT subscribers WHERE publication_id = ...
    API->>API: Ставит в очередь Bull job "send-article-email"
    API-->>Editor: {published: true, url: "/slug/article-slug"}
    Editor->>Author: "Статья опубликована! Открыть →"
```
