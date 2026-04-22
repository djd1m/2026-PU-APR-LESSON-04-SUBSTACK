# Product Requirements Document

**Product:** SubStack RU (рабочее название)
**Version:** 0.1
**Дата:** 2026-04-22
**Статус:** Draft

---

## 1. Executive Summary

### 1.1 Purpose

SubStack RU — российская платформа для независимых создателей контента, позволяющая публиковать email-рассылки, подкасты и видео с монетизацией через платные подписки. Платформа решает проблему отсутствия в России newsletter-платформы с локальными платежами и комплаенсом 152-ФЗ.

### 1.2 Scope

**In Scope:**
- Newsletter publishing (Markdown + Rich Text редактор)
- Email-доставка (free/paid разделение)
- Платные подписки (CloudPayments, СБП, YooKassa)
- Профили авторов и публичные страницы
- Аналитика (subscribers, opens, clicks, revenue)
- Yandex SEO (SSR, sitemap, meta)
- Рекомендательная сеть
- Реферальная программа
- AI co-pilot для авторов
- Подкасты, видео, Quick Posts (post-MVP)
- Комплаенс 152-ФЗ и реестр блогеров

**Out of Scope:**
- Мобильные приложения (web-first, PWA на MVP)
- Enterprise/B2B функции
- Международная экспансия
- Собственный платёжный процессинг

### 1.3 Definitions

| Термин | Определение |
|--------|------------|
| Автор | Создатель контента, публикующий на платформе |
| Подписчик | Читатель, подписанный на рассылку автора |
| Публикация | Бренд автора (название, URL, аватар) |
| Статья | Единица контента (текст, опционально audio/video) |
| Take rate | Комиссия платформы с платных подписок (10%) |
| Free tier | Бесплатный контент, доступный всем подписчикам |
| Paid tier | Контент, доступный только платным подписчикам |

---

## 2. Product Vision

### 2.1 Vision Statement

> Стать стандартной платформой для email-first монетизации контента в России, где каждый автор владеет своей аудиторией и зарабатывает напрямую от читателей.

### 2.2 Problem Statement

**Problem:** Российские создатели контента не могут монетизировать аудиторию через email-рассылки. Substack/Ghost/Beehiiv не принимают российские платежи. Boosty не имеет email-инструментов. Дзен берёт 30%+ и не даёт email-доставку.

**Impact:** 50,000+ авторов теряют потенциальный доход. Рынок ₽5-8B GMV/год не обслужен.

**Current Solutions:**
- Boosty: есть платежи, нет email → авторы не владеют аудиторией
- Дзен Premium: есть аудитория (75M), но 30%+ take и нет email
- VK Donut: привязан к VK ecosystem, нет email
- Самостоятельные решения: WordPress + Mailchimp + ЮKassa → сложно, дорого, требует разработчика

### 2.3 Success Metrics

| Метрика | MVP (M3) | v1.0 (M6) | v2.0 (M12) |
|---------|---------|----------|-----------|
| Active authors | 100 | 500 | 2,000 |
| Total subscribers | 5,000 | 50,000 | 500,000 |
| Paid subscribers | 200 | 5,000 | 50,000 |
| MRR (platform) | ₽50K | ₽500K | ₽2.5M |
| Email open rate | >40% | >40% | >35% |
| Author D30 retention | >50% | >60% | >65% |

---

## 3. Target Users

### 3.1 Primary Persona: Независимый автор

| Атрибут | Описание |
|---------|----------|
| **Роль** | Журналист, блогер, эссеист |
| **Демография** | 28-45 лет, Россия, средний+ доход |
| **Цели** | Зарабатывать на контенте, владеть аудиторией |
| **Pain Points** | Не может принимать платежи через Substack; зависим от алгоритмов VK/Дзен; Boosty не даёт email |
| **Техническая грамотность** | Средняя |
| **Частота использования** | 2-4 раза/неделю (публикация + аналитика) |

### 3.2 Secondary Persona: Эксперт / Создатель курсов

| Атрибут | Описание |
|---------|----------|
| **Роль** | Бизнес-консультант, преподаватель, коуч |
| **Демография** | 30-50 лет, Россия |
| **Цели** | Монетизировать экспертизу через регулярный контент |
| **Pain Points** | Getcourse слишком сложен и дорог; VK-группы не монетизируются |
| **Техническая грамотность** | Низкая-средняя |
| **Частота использования** | 1-2 раза/неделю |

### 3.3 Tertiary Persona: Подкастер / Мультимедиа

| Атрибут | Описание |
|---------|----------|
| **Роль** | Подкастер, видеоэссеист |
| **Демография** | 25-38 лет |
| **Цели** | Распространять audio/video с оплатой от слушателей |
| **Pain Points** | YouTube демонетизирован для РФ; Boosty не имеет RSS |
| **Техническая грамотность** | Средняя-высокая |
| **Частота использования** | 1-2 раза/неделю |

### 3.4 Anti-Personas

- Корпоративные маркетологи (ищут mass email → не наш продукт)
- Спамеры (фильтруются KYC при выплатах)
- Авторы без аудитории (нет discovery без сети → холодный старт)

---

## 4. User Journeys

### 4.1 Journey: Автор публикует первую статью (Writer-First CJM)

**Persona:** Независимый автор
**Goal:** Опубликовать первую статью и получить первых подписчиков
**Trigger:** Узнал о платформе от коллеги / увидел в поиске

```
Step 1: Landing Page
  Action: Читает "Публикуй. Зарабатывай. Без посредников."
  Response: Видит CTA "Создать публикацию"
  → Step 2

Step 2: Registration (2 min)
  Action: Вводит email + пароль
  Response: Подтверждает email, попадает в wizard
  → Step 3

Step 3: Publication Setup (3 min)
  Action: Вводит название, описание, загружает аватар
  Response: Публикация создана, публичная страница готова
  → Step 4

Step 4: First Article (10 min)
  Action: Пишет статью в редакторе, нажимает "Опубликовать"
  Response: Статья на публичной странице, email отправлен (0 подписчиков пока)
  → Step 5

Step 5: Share & First Subscribers
  Action: Делится ссылкой в VK, на форумах, по email
  Response: Читатели подписываются (free)
  → Step 6 (через дни/недели)

Step 6: AHA — First Paid Subscriber
  Action: Включает paid tier (один переключатель)
  Response: Видит первый платёж в dashboard → эмоция!
  Outcome: Автор "подсел" — retention secured
```

### 4.2 Journey: Читатель подписывается и платит

**Persona:** Читатель
**Goal:** Подписаться на любимого автора
**Trigger:** Получил ссылку на статью / нашёл в Yandex

```
Step 1: Read Article
  Action: Читает бесплатную статью на публичной странице
  Response: Видит "Подпишитесь, чтобы не пропустить"
  → Step 2

Step 2: Free Subscribe
  Action: Вводит email
  Response: Подтверждает подписку, начинает получать статьи
  → Step 3 (через дни)

Step 3: Hit Paywall
  Action: Открывает paid-статью, видит teaser + paywall
  Response: Видит "Оформить подписку от 300 ₽/мес"
  → Step 4

Step 4: Pay
  Action: Оплачивает через СБП (QR) или карту Mir
  Response: Мгновенный доступ к статье + всему paid-архиву
  Outcome: Paid subscriber
```

---

## 5. Release Strategy

### 5.1 MVP (Month 1-3)

| Feature | Priority | Status |
|---------|----------|--------|
| Редактор статей | Must | Planned |
| Email-доставка | Must | Planned |
| Платные подписки | Must | Planned |
| Профиль автора + публичная страница | Must | Planned |
| Базовая аналитика | Must | Planned |
| Yandex SEO (SSR) | Must | Planned |
| CSV-экспорт | Must | Planned |
| Auth (email + password) | Must | Planned |

**Success Criteria:**
- [ ] 100 авторов зарегистрировались
- [ ] 1,000 подписчиков (free + paid)
- [ ] Email open rate > 40%
- [ ] Первая платная подписка оформлена

### 5.2 v1.0 (Month 4-6)

| Feature | Priority | Status |
|---------|----------|--------|
| Рекомендательная сеть | Should | Planned |
| Реферальная программа | Should | Planned |
| AI co-pilot | Should | Planned |
| Микро-типпинг | Should | Planned |
| Админ-панель | Should | Planned |

### 5.3 Future (Month 7-12)

| Phase | Features |
|-------|----------|
| v1.5 (M7-9) | Подкасты, видео, Quick Posts, Audio TTS |
| v2.0 (M10-12) | Bundle Pass, магазин, геймификация, API |

---

## 6. Dependencies

### 6.1 External

| Зависимость | Провайдер | Риск | Митигация |
|------------|----------|:----:|-----------|
| Payment processing | CloudPayments | Medium | Fallback: YooKassa, СБП |
| Email delivery | SendPulse / Unisender | Medium | Multi-provider setup |
| Hosting (Russia) | AdminVPS / HOSTKEY | Low | Multi-provider |
| CDN | Yandex Cloud CDN | Low | Fallback: собственный nginx cache |
| AI (TTS, co-pilot) | Yandex SpeechKit / OpenAI API | Low | Деградация: feature недоступна |

---

## 7. Risks & Mitigations

| ID | Риск | P | I | Митигация |
|----|------|:-:|:-:|-----------|
| R-001 | Boosty добавит email | Med | High | Network effect, SEO moat, AI features |
| R-002 | Cold start (мало авторов) | High | High | Seed 20-50 авторов с 0% take |
| R-003 | Email deliverability | Med | High | Dedicated IP, warm-up, SPF/DKIM/DMARC |
| R-004 | Регуляторное давление | High | Med | Compliance-first, юрконсалтинг |
| R-005 | Масштабирование email infra | Med | Med | Graduated: VPS → managed ESP |
| R-006 | Payment processor downtime | Med | High | 3 провайдера с failover |

---

## 8. Open Questions

| ID | Вопрос | Owner | Статус |
|----|--------|-------|--------|
| Q-001 | Юридическая форма: ИП или ООО? | Founder | Open |
| Q-002 | Нужна ли онлайн-касса (54-ФЗ) при agency модели? | Legal | Open |
| Q-003 | Лимиты СБП для recurring payments? | Payment team | Open |
| Q-004 | Warm-up стратегия для нового email-домена? | DevOps | Open |
| Q-005 | Минимальный порог выплат авторам? | Product | Open — предварительно ₽1,000 |

---

*SPARC PRD v0.1. Создан на основе Product Discovery Brief, Research Findings и Solution Strategy.*
