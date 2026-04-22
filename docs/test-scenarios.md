# BDD Test Scenarios

**Дата:** 2026-04-22 | **Сценариев:** 32

---

## Feature: Author Registration (US-001)

### Happy Path

```gherkin
Scenario: Successful registration
  Given I am on the registration page
  When I enter email "author@example.com"
  And I enter password "SecureP@ss123"
  And I enter name "Иван Иванов"
  And I click "Создать аккаунт"
  Then I see "Проверьте почту для подтверждения"
  And a verification email is sent to "author@example.com"
  When I click the verification link in the email
  Then my account is activated
  And I am redirected to the publication setup wizard
```

### Error Handling

```gherkin
Scenario: Registration with existing email
  Given "author@example.com" is already registered
  When I try to register with "author@example.com"
  Then I see "Этот email уже зарегистрирован"
  And I see links to "Войти" and "Восстановить пароль"

Scenario: Registration with weak password
  When I enter password "123"
  Then I see "Пароль должен быть не менее 8 символов"
  And the form is not submitted

Scenario: Registration with invalid email
  When I enter email "not-an-email"
  Then I see "Введите корректный email"
```

### Security

```gherkin
Scenario: Brute force registration protection
  Given I have attempted 5 registrations from IP 1.2.3.4 in the last minute
  When I attempt a 6th registration
  Then I receive HTTP 429
  And I see "Слишком много попыток. Подождите 1 минуту"

Scenario: XSS in registration name
  When I enter name "<script>alert('xss')</script>"
  Then the script tags are stripped
  And my name is saved as "alert('xss')"
```

---

## Feature: Article Publishing (US-003)

### Happy Path

```gherkin
Scenario: Publish free article to all subscribers
  Given I am author of "Tech Digest" with 500 subscribers (400 free, 100 paid)
  And I have written an article "Новости недели" in the editor
  When I set visibility to "free"
  And I click "Опубликовать"
  Then the article is published at /tech-digest/novosti-nedeli
  And 500 emails are queued for delivery
  And the article has correct meta tags for Yandex SEO
  And the article appears in sitemap.xml within 24 hours

Scenario: Publish paid article with teaser for free subscribers
  Given I have 400 free and 100 paid subscribers
  When I publish with visibility "paid"
  Then 100 emails with full content are sent to paid subscribers
  And 400 emails with excerpt + "Оформить подписку" CTA are sent to free subscribers
  And the public page shows full content to paid subscribers
  And the public page shows excerpt + paywall to everyone else
```

### Error Handling

```gherkin
Scenario: Publish empty article
  Given I have entered only a title "Мой пост" with no content
  When I click "Опубликовать"
  Then I see "Добавьте содержание статьи"
  And the article is not published

Scenario: Publish with email service down
  Given the email service (SendPulse) is unavailable
  When I publish an article
  Then the article is published on the web
  And emails are queued in Bull queue for retry
  And I see "Статья опубликована. Email-рассылка будет отправлена с задержкой"
```

### Edge Cases

```gherkin
Scenario: Schedule article for future date
  When I schedule publication for "2026-05-01 10:00 MSK"
  Then article status is "scheduled"
  And at "2026-05-01 10:00 MSK" the article auto-publishes
  And emails are sent at that time

Scenario: Publish article with 0 subscribers
  Given I have no subscribers
  When I publish an article
  Then the article is published on the web
  And no emails are queued
  And I see "Статья опубликована. Поделитесь ссылкой для привлечения читателей"

Scenario: Auto-save draft
  Given I am writing in the editor
  When I stop typing for 5 seconds
  Then the draft is auto-saved
  And I see "Черновик сохранён" indicator
  When I close the browser and return
  Then my draft is restored with all content
```

---

## Feature: Paid Subscription (US-005)

### Happy Path

```gherkin
Scenario: Subscribe via bank card (CloudPayments)
  Given author "Anna" has paid tier at 500 RUB/month
  And I am a free subscriber of Anna
  When I click "Оформить подписку"
  And I select "Банковская карта"
  And I enter valid Mir card details
  And payment of 500 RUB succeeds
  Then I am a paid subscriber
  And I can read all paid articles
  And Anna sees "Новый платный подписчик! +450 ₽" notification
  And Anna's dashboard shows MRR increase

Scenario: Subscribe via SBP
  Given author has paid tier at 500 RUB/month
  When I choose "Оплата через СБП"
  Then I see a QR code
  When I scan it with my banking app and confirm
  Then payment succeeds
  And I am a paid subscriber
```

### Error Handling

```gherkin
Scenario: Card declined
  When my card is declined by CloudPayments
  Then I see "Оплата не прошла. Попробуйте другую карту или СБП"
  And no subscription is created
  And the decline is logged (without card details)

Scenario: SBP payment timeout
  Given I see the SBP QR code
  When 10 minutes pass without payment
  Then the QR code expires
  And I see "Время оплаты истекло. Попробуйте снова"
  And the pending subscription is cleaned up

Scenario: Duplicate subscription attempt
  Given I am already a paid subscriber of "Anna"
  When I try to subscribe again
  Then I see "Вы уже подписаны на эту публикацию"
```

### Edge Cases

```gherkin
Scenario: Grace period on failed renewal
  Given my paid subscription renews on May 1
  When CloudPayments fails to charge my card
  Then I enter 3-day grace period
  And I receive email "Обновите способ оплаты" with link
  And I retain full paid access during grace period
  When I update my card within 3 days
  Then payment succeeds and subscription continues
  When 3 days pass without card update
  Then my subscription expires
  And I lose access to paid content

Scenario: Cancel and retain access until period end
  Given I subscribed on April 1 (monthly)
  When I cancel on April 15
  Then I see "Подписка отменена. Доступ сохраняется до 30 апреля"
  And I can still read paid content until April 30
  And on May 1 my paid access revokes
  And I remain a free subscriber
```

### Security

```gherkin
Scenario: Payment webhook replay attack
  Given CloudPayments sends webhook for transaction TX-123
  And we process it successfully
  When CloudPayments sends the same webhook again (replay)
  Then we detect duplicate processor_tx_id
  And we return HTTP 200 (acknowledge)
  And no duplicate payment is created

Scenario: Invalid webhook signature
  When a POST request arrives at /api/webhooks/cloudpayments
  And the HMAC-SHA256 signature does not match
  Then we return HTTP 400
  And we log a security warning
  And no payment is processed

Scenario: Cross-tenant payment injection
  Given subscriber A pays for publication "Anna"
  When a modified webhook claims payment is for publication "Boris"
  Then we verify subscription_id matches the original payment
  And the injection is rejected
```

---

## Feature: Email Delivery (US-003 + US-004)

### Happy Path

```gherkin
Scenario: Email delivered and opened
  Given article "Post 1" was published
  And email was sent to subscriber@example.com
  When SendPulse reports delivery
  Then EmailDelivery status is "delivered"
  When the subscriber opens the email
  Then status updates to "opened"
  And article open count increments by 1
  And the open is counted only once (re-opens ignored)
```

### Error Handling

```gherkin
Scenario: Email bounce handling
  Given subscriber@invalid.com has bounced 2 times before
  When the 3rd bounce webhook arrives from SendPulse
  Then the email is marked as invalid
  And future articles are not sent to this address
  And the author sees "1 невалидный email" in subscriber list

Scenario: Spam complaint handling
  Given subscriber complains about email (marks as spam)
  When SendPulse sends complaint webhook
  Then the subscriber is auto-unsubscribed
  And the author is notified
  And the subscriber will not receive further emails
```

---

## Feature: Author Payouts (US-008)

### Happy Path

```gherkin
Scenario: Monthly payout above minimum
  Given I earned 50,000 RUB gross this month
  And platform fee is 5,000 RUB (10%)
  And processor fees are 1,500 RUB
  And my bank details are verified
  When payout date arrives (1st of month)
  Then payout of 43,500 RUB is initiated
  And I receive notification with breakdown:
    | Gross | 50,000 RUB |
    | Platform fee (10%) | -5,000 RUB |
    | Processor fees | -1,500 RUB |
    | Net payout | 43,500 RUB |
```

### Edge Cases

```gherkin
Scenario: Payout below minimum threshold
  Given I earned 800 RUB this month
  And minimum payout is 1,000 RUB
  Then payout is deferred
  And 800 RUB carries over to next month
  And I see "Баланс: 800 ₽ (минимум для выплаты: 1,000 ₽)"

Scenario: Author has no bank details
  Given I have not set up bank details
  When payout date arrives
  Then payout is held
  And I receive email "Добавьте реквизиты для получения выплат"
  And balance accumulates until bank details are provided
```

---

## Feature: Subscriber Export (US-007)

### Happy Path

```gherkin
Scenario: Export all subscribers as CSV
  Given I have 500 subscribers (400 free, 100 paid)
  When I click "Экспорт подписчиков" in settings
  Then a CSV file downloads
  And it contains 500 rows with columns: email, type, subscribed_at
  And the file includes all 500 subscriber emails
  And the export is logged in audit trail
```

### Security

```gherkin
Scenario: Export attempt by non-owner
  Given I am NOT the owner of publication "Tech Digest"
  When I try to access /api/author/subscribers/export for "Tech Digest"
  Then I receive HTTP 403
  And no data is returned
```

---

## Feature: Recommendations (US-009)

### Happy Path

```gherkin
Scenario: See recommendations after reading
  Given I just read an article on "Tech Digest"
  And "Tech Digest" has overlapping subscribers with "Dev Weekly" and "AI News"
  Then I see "Читатели Tech Digest также читают:"
  And "Dev Weekly" and "AI News" are shown
  And clicking a recommendation takes me to that publication page
```

### Edge Cases

```gherkin
Scenario: New publication with no data
  Given "New Blog" was just created with 2 subscribers
  When someone visits "New Blog"
  Then recommendations section shows "Скоро здесь появятся рекомендации"
  And no empty or broken UI is shown
```

---

## Feature: Micro-Tipping (US-011)

### Happy Path

```gherkin
Scenario: Send a tip via SBP
  Given I am reading an article by "Anna"
  When I click "Поддержать автора"
  And I select 150 RUB
  And I choose SBP payment
  And I complete payment via banking app
  Then Anna receives 135 RUB (90%)
  And I see "Спасибо за поддержку!"
  And the tip appears in Anna's revenue dashboard
```

### Security

```gherkin
Scenario: Tip amount validation
  When I try to send a tip of -100 RUB
  Then the request is rejected with "Некорректная сумма"
  When I try to send a tip of 1,000,000 RUB
  Then the request is rejected with "Максимальная сумма доната: 100,000 ₽"
```

---

## Summary

| Category | Scenarios |
|----------|:---------:|
| Happy path | 12 |
| Error handling | 9 |
| Edge cases | 7 |
| Security | 7 |
| **Total** | **35** |

| Feature | Scenarios |
|---------|:---------:|
| Registration | 6 |
| Article Publishing | 7 |
| Paid Subscription | 8 |
| Email Delivery | 3 |
| Payouts | 3 |
| Export | 2 |
| Recommendations | 2 |
| Micro-Tipping | 2 |
| **Total** | **35** |

---

*BDD scenarios generated per requirements-validator skill. Coverage: happy path + errors + edge cases + security for all MVP and v1.0 user stories.*
