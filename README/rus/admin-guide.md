# Руководство администратора SubStack RU

## Роли пользователей

Система поддерживает три роли:

| Роль | Описание | Возможности |
|------|----------|-------------|
| `reader` | Читатель | Просмотр публикаций, оформление подписок |
| `author` | Автор | Всё, что reader + создание публикации, написание статей, получение выплат |
| `admin` | Администратор | Полный доступ: управление пользователями, модерация, системные настройки |

### Назначение роли администратора

```bash
# Через Prisma Studio (интерактивно)
docker compose exec backend npx prisma studio

# Через SQL напрямую
docker compose exec postgres psql -U substack substack_db \
  -c "UPDATE users SET role = 'admin' WHERE email = 'admin@yourdomain.ru';"

# Проверка
docker compose exec postgres psql -U substack substack_db \
  -c "SELECT id, email, role, created_at FROM users WHERE role = 'admin';"
```

---

## Управление пользователями

### Просмотр списка пользователей

```bash
# Все пользователи
docker compose exec postgres psql -U substack substack_db \
  -c "SELECT id, email, display_name, role, created_at, deleted_at FROM users ORDER BY created_at DESC LIMIT 50;"

# Только авторы
docker compose exec postgres psql -U substack substack_db \
  -c "SELECT u.id, u.email, u.display_name, p.title AS publication FROM users u LEFT JOIN publications p ON p.author_id = u.id WHERE u.role = 'author';"

# Пользователи за последние 7 дней
docker compose exec postgres psql -U substack substack_db \
  -c "SELECT email, role, created_at FROM users WHERE created_at > NOW() - INTERVAL '7 days' ORDER BY created_at DESC;"
```

### Блокировка пользователя (мягкое удаление)

```bash
docker compose exec postgres psql -U substack substack_db \
  -c "UPDATE users SET deleted_at = NOW() WHERE email = 'bad-actor@example.com';"
```

### Смена роли пользователя

```bash
# Повысить до автора
docker compose exec postgres psql -U substack substack_db \
  -c "UPDATE users SET role = 'author' WHERE email = 'user@example.com';"

# Понизить до читателя
docker compose exec postgres psql -U substack substack_db \
  -c "UPDATE users SET role = 'reader' WHERE email = 'user@example.com';"
```

### Сброс пароля пользователя

Система использует механизм email-сброса пароля. Для принудительного сброса:

```bash
# Инвалидируем все refresh токены пользователя в Redis
docker compose exec redis redis-cli -p 6380 KEYS "refresh:*" | xargs docker compose exec redis redis-cli -p 6380 DEL

# Отправляем ссылку сброса через API
curl -X POST http://localhost:3010/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

---

## Модерация публикаций

### Просмотр всех публикаций

```bash
docker compose exec postgres psql -U substack substack_db \
  -c "SELECT p.id, p.title, p.slug, u.email AS author, p.created_at FROM publications p JOIN users u ON u.id = p.author_id ORDER BY p.created_at DESC;"
```

### Просмотр статей на модерацию

```bash
docker compose exec postgres psql -U substack substack_db \
  -c "SELECT a.id, a.title, a.visibility, a.published_at, p.title AS publication, u.email AS author FROM articles a JOIN publications p ON p.id = a.publication_id JOIN users u ON u.id = p.author_id WHERE a.deleted_at IS NULL ORDER BY a.published_at DESC LIMIT 20;"
```

### Удаление нарушающей статьи

```bash
# Мягкое удаление (статья скрывается, данные сохраняются)
docker compose exec postgres psql -U substack substack_db \
  -c "UPDATE articles SET deleted_at = NOW() WHERE id = 'article-uuid-here';"
```

### Блокировка публикации

```bash
docker compose exec postgres psql -U substack substack_db \
  -c "UPDATE publications SET deleted_at = NOW() WHERE slug = 'publication-slug';"
```

---

## Мониторинг доставки email

### Resend Dashboard

1. Войдите на [resend.com](https://resend.com) → **Logs**
2. Фильтруйте по домену, статусу (delivered, bounced, complained)
3. При проблемах с доставляемостью проверьте **Domain** → статус DNS записей

### Внутренний мониторинг таблицы email_deliveries

```bash
# Статистика доставки за последние 24 часа
docker compose exec postgres psql -U substack substack_db \
  -c "SELECT status, COUNT(*) FROM email_deliveries WHERE created_at > NOW() - INTERVAL '24 hours' GROUP BY status;"

# Неудачные отправки
docker compose exec postgres psql -U substack substack_db \
  -c "SELECT id, email_type, error_message, created_at FROM email_deliveries WHERE status = 'failed' ORDER BY created_at DESC LIMIT 20;"

# Очередь Bull (pending задачи)
docker compose exec redis redis-cli -p 6380 LLEN bull:email:wait
```

---

## Системная конфигурация (.env переменные)

### Критические переменные

| Переменная | Описание | Пример |
|-----------|----------|--------|
| `DATABASE_URL` | Строка подключения к PostgreSQL | `postgresql://user:pass@localhost:5437/db` |
| `REDIS_URL` | Строка подключения к Redis | `redis://localhost:6380` |
| `JWT_SECRET` | Секрет для подписи JWT (≥32 символов) | `openssl rand -base64 64` |
| `JWT_REFRESH_SECRET` | Секрет для refresh токенов | `openssl rand -base64 64` |
| `RESEND_API_KEY` | API ключ Resend | `re_xxx...` |
| `CLOUDPAYMENTS_API_SECRET` | Секрет CloudPayments | `your-secret` |
| `CLOUDPAYMENTS_WEBHOOK_SECRET` | Секрет для HMAC webhook | `your-webhook-secret` |

### Изменение конфигурации на продакшне

```bash
# 1. Отредактируйте .env на сервере
nano /opt/substack-ru/.env

# 2. Перезапустите backend (frontend не требует перезапуска для большинства изменений)
docker compose restart backend

# 3. Проверьте логи после перезапуска
docker compose logs --tail=50 backend
```

---

## Мониторинг системы

### Просмотр логов

```bash
# Все сервисы (последние 100 строк + live)
docker compose logs --tail=100 -f

# Только backend
docker compose logs --tail=100 -f backend

# Только frontend
docker compose logs --tail=100 -f frontend

# Поиск ошибок в логах
docker compose logs backend 2>&1 | grep -i "error\|exception\|fatal"

# Логи за конкретный период
docker compose logs --since="2026-04-29T10:00:00" --until="2026-04-29T11:00:00" backend
```

### Health check эндпоинт

```bash
# Базовая проверка
curl http://localhost:3010/api/health

# Подробная проверка с jq
curl -s http://localhost:3010/api/health | jq .

# Ожидаемый ответ:
# {
#   "status": "ok",
#   "timestamp": "2026-04-29T10:00:00.000Z",
#   "services": {
#     "database": "ok",
#     "redis": "ok"
#   }
# }
```

### Мониторинг ресурсов Docker

```bash
# Потребление CPU и памяти по контейнерам
docker stats --no-stream

# Место на диске
docker system df

# Очистка неиспользуемых ресурсов
docker system prune -f
```

### Интеграция с Sentry (если настроен)

Добавьте в `.env`:
```env
SENTRY_DSN=https://your-key@sentry.io/project-id
```

Ошибки backend автоматически отправляются в Sentry. Фильтр для просмотра только продакшн-ошибок в Sentry: `environment:production level:error`.

---

## Резервное копирование и восстановление

### Создание резервной копии

```bash
# Создайте директорию для бэкапов
mkdir -p /opt/substack-ru/backups

# Полный дамп БД
docker compose exec -T postgres pg_dump \
  -U substack \
  -Fc \
  substack_db > /opt/substack-ru/backups/backup_$(date +%Y%m%d_%H%M%S).dump

# Только схема (без данных)
docker compose exec -T postgres pg_dump \
  -U substack \
  --schema-only \
  substack_db > /opt/substack-ru/backups/schema_$(date +%Y%m%d).sql

# Проверка размера бэкапа
ls -lh /opt/substack-ru/backups/
```

### Автоматическое резервное копирование (cron)

```bash
# Добавьте в crontab: crontab -e
# Ежедневно в 2:00 ночи
0 2 * * * cd /opt/substack-ru && docker compose exec -T postgres pg_dump -U substack -Fc substack_db > /opt/substack-ru/backups/backup_$(date +\%Y\%m\%d).dump && find /opt/substack-ru/backups -name "backup_*.dump" -mtime +30 -delete
```

### Восстановление из резервной копии

```bash
# Остановите backend (frontend может работать, показывая cached страницы)
docker compose stop backend

# Восстановление (Fc формат)
docker compose exec -T postgres pg_restore \
  -U substack \
  -d substack_db \
  --clean \
  --if-exists \
  < /opt/substack-ru/backups/backup_20260429_020000.dump

# Запустите backend
docker compose start backend

# Проверьте работоспособность
curl http://localhost:3010/api/health
```

---

## Устранение типичных проблем

### CORS ошибки (из insights)

**Симптом:** Браузер блокирует запросы `Access-Control-Allow-Origin` ошибкой.

**Решение:**
```bash
# Проверьте настройки CORS в .env
grep FRONTEND_URL /opt/substack-ru/.env

# Убедитесь, что FRONTEND_URL совпадает с origin браузера
# Например: FRONTEND_URL=https://yourdomain.ru (без trailing slash!)

# Перезапустите backend
docker compose restart backend
```

### JWT истечение токена

**Симптом:** Пользователи жалуются на неожиданные выходы из системы.

**Проверка и решение:**
```bash
# Проверьте настройки JWT_EXPIRES_IN
grep JWT_EXPIRES_IN /opt/substack-ru/.env
# Должно быть: JWT_EXPIRES_IN=15m (access) и JWT_REFRESH_EXPIRES_IN=30d (refresh)

# Если refresh токены инвалидированы из-за перезапуска Redis без persistence:
# Настройте Redis persistence в docker-compose.yml
```

### Конфликты портов Docker

**Симптом:** `Error: Port 5432 is already allocated` или подобное.

**Решение:** SubStack RU использует нестандартные порты специально:
- PostgreSQL: **5437** (не 5432)
- Redis: **6380** (не 6379)

```bash
# Проверьте занятые порты
ss -tlnp | grep -E "5437|6380|3010|3011|9010"

# Если порт занят другим процессом:
docker compose down
# Измените порт в docker-compose.yml и .env
docker compose up -d
```

### Tailwind v4 стили не применяются

**Симптом:** Стили выглядят некорректно, CSS не загружается.

**Решение:**
```bash
# Пересоберите frontend образ
docker compose build --no-cache frontend
docker compose up -d frontend

# Проверьте логи сборки
docker compose logs frontend | grep -i "tailwind\|css\|build"
```

### Backend не запускается (Prisma)

**Симптом:** `Error: P1001: Can't reach database server`

**Решение:**
```bash
# Проверьте статус PostgreSQL
docker compose ps postgres
docker compose logs postgres --tail=20

# Проверьте соединение с БД
docker compose exec postgres pg_isready -U substack

# Убедитесь, что DATABASE_URL корректна
grep DATABASE_URL /opt/substack-ru/.env

# Пересоздайте контейнер БД при необходимости
docker compose down postgres
docker compose up -d postgres
sleep 15
docker compose restart backend
```

### URL статей не работают (404)

**Симптом:** Переход по URL статьи `/p/[slug]` возвращает 404.

**Решение:** Убедитесь, что slug статьи совпадает с форматом в БД:
```bash
docker compose exec postgres psql -U substack substack_db \
  -c "SELECT slug, title, published_at FROM articles WHERE slug = 'your-slug';"
```

---

## Полезные команды администратора

```bash
# Статистика платформы
docker compose exec postgres psql -U substack substack_db -c "
SELECT
  (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL) AS total_users,
  (SELECT COUNT(*) FROM users WHERE role = 'author' AND deleted_at IS NULL) AS authors,
  (SELECT COUNT(*) FROM publications WHERE deleted_at IS NULL) AS publications,
  (SELECT COUNT(*) FROM articles WHERE published_at IS NOT NULL AND deleted_at IS NULL) AS published_articles,
  (SELECT COUNT(*) FROM subscriptions WHERE status = 'active') AS active_subscriptions,
  (SELECT SUM(amount) FROM payments WHERE status = 'completed') AS total_revenue_kopecks;
"

# Перезапуск всех сервисов
docker compose restart

# Просмотр конфигурации Docker Compose
docker compose config
```
