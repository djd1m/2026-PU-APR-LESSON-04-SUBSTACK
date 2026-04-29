# Развертывание системы SubStack RU

## Требования к серверу

### Минимальные требования

| Компонент | Минимум | Рекомендуется |
|-----------|---------|---------------|
| CPU | 2 ядра | 4 ядра |
| RAM | 4 GB | 8 GB |
| SSD | 20 GB | 100 GB |
| ОС | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |
| Docker | 24.0+ | 24.0+ |
| Docker Compose | 2.20+ | 2.20+ |
| Node.js | 20.0+ (для локальной разработки) | 20.0+ |

### Требования к расположению серверов

В соответствии с 152-ФЗ все серверы должны располагаться на территории Российской Федерации.
Рекомендуемые провайдеры: **AdminVPS**, **HOSTKEY**, **Timeweb Cloud**, **Selectel**.

---

## Быстрый старт (локальная разработка)

### 1. Клонирование репозитория

```bash
git clone https://github.com/your-org/substack-ru.git
cd substack-ru
```

### 2. Настройка переменных окружения

Скопируйте файл примера и заполните значения:

```bash
cp .env.example .env
```

Обязательные переменные:

```env
# База данных
DATABASE_URL=postgresql://substack:password@localhost:5437/substack_db
REDIS_URL=redis://localhost:6380

# JWT (генерируйте через: openssl rand -base64 64)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

# Email (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.ru

# Платежи CloudPayments
CLOUDPAYMENTS_PUBLIC_ID=pk_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
CLOUDPAYMENTS_API_SECRET=your-cloudpayments-secret
CLOUDPAYMENTS_WEBHOOK_SECRET=your-webhook-secret

# YooKassa (резервный провайдер)
YOOKASSA_SHOP_ID=your-shop-id
YOOKASSA_SECRET_KEY=your-secret-key

# MinIO (хранилище файлов)
MINIO_ENDPOINT=localhost
MINIO_PORT=9010
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=substack-ru

# Приложение
BACKEND_URL=http://localhost:3010
FRONTEND_URL=http://localhost:3011
NODE_ENV=development
```

### 3. Запуск через Docker Compose

```bash
# Запуск всех сервисов (БД, Redis, MinIO)
docker compose up -d postgres redis minio

# Ожидание готовности БД (10-15 секунд)
sleep 15

# Применение миграций Prisma
docker compose run --rm backend npx prisma migrate deploy

# Заполнение начальными данными (опционально)
docker compose run --rm backend npx prisma db seed

# Запуск backend и frontend
docker compose up -d backend frontend
```

### 4. Проверка работоспособности

```bash
# Проверка статуса контейнеров
docker compose ps

# Проверка health endpoint
curl http://localhost:3010/api/health

# Ожидаемый ответ:
# {"status":"ok","timestamp":"2026-04-29T10:00:00.000Z","services":{"database":"ok","redis":"ok"}}
```

### 5. Доступ к приложению

| Сервис | URL |
|--------|-----|
| Frontend (Next.js) | http://localhost:3011 |
| Backend API | http://localhost:3010/api |
| API документация | http://localhost:3010/api/docs |
| MinIO Console | http://localhost:9011 |

---

## Продакшн развертывание

### Подготовка сервера

```bash
# Подключение к VPS
ssh root@your-server-ip

# Установка Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# Установка Docker Compose
apt-get install -y docker-compose-plugin

# Создание рабочей директории
mkdir -p /opt/substack-ru
cd /opt/substack-ru
```

### Настройка SSL через Caddy

Caddy должен быть установлен и настроен на сервере. Добавьте в `Caddyfile`:

```caddyfile
api.yourdomain.ru {
    reverse_proxy localhost:3010
}

yourdomain.ru {
    reverse_proxy localhost:3011
}
```

Перезагрузите Caddy:
```bash
systemctl reload caddy
```

### Деплой через SSH

```bash
# На локальной машине — сборка и отправка образов
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml push

# На VPS — обновление
ssh root@your-server-ip "cd /opt/substack-ru && \
  git pull origin main && \
  docker compose -f docker-compose.prod.yml pull && \
  docker compose -f docker-compose.prod.yml up -d"
```

### Применение миграций на продакшне

```bash
ssh root@your-server-ip "cd /opt/substack-ru && \
  docker compose -f docker-compose.prod.yml run --rm backend \
  npx prisma migrate deploy"
```

---

## Настройка Resend API

### Получение API ключа

1. Зарегистрируйтесь на [resend.com](https://resend.com)
2. Перейдите в раздел **API Keys** → **Create API Key**
3. Скопируйте ключ (начинается с `re_`)
4. Добавьте в `.env`: `RESEND_API_KEY=re_your_key_here`

### Верификация домена

1. В Resend перейдите **Domains** → **Add Domain**
2. Введите ваш домен (например, `yourdomain.ru`)
3. Добавьте DNS записи, которые покажет Resend:
   - TXT запись для верификации домена
   - MX запись (опционально, для получения писем)
   - DKIM записи (обязательно для доставляемости)
4. Дождитесь верификации (обычно 5-15 минут)
5. Обновите `RESEND_FROM_EMAIL=noreply@yourdomain.ru`

### Тестирование отправки

```bash
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "noreply@yourdomain.ru",
    "to": "test@example.com",
    "subject": "Тест SubStack RU",
    "html": "<p>Тестовое письмо</p>"
  }'
```

---

## Процедура обновления

### Стандартное обновление

```bash
# 1. Создайте резервную копию БД
docker compose exec postgres pg_dump -U substack substack_db > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Получите новый код
git pull origin main

# 3. Пересоберите образы (если изменился Dockerfile)
docker compose -f docker-compose.prod.yml build

# 4. Примените миграции БД
docker compose -f docker-compose.prod.yml run --rm backend npx prisma migrate deploy

# 5. Перезапустите сервисы с минимальным downtime
docker compose -f docker-compose.prod.yml up -d --no-deps backend frontend

# 6. Проверьте работоспособность
curl http://localhost:3010/api/health
```

### Обновление зависимостей

```bash
# Обновление npm пакетов (локально, затем коммит)
npm update
npm audit fix

# Обновление Docker образов
docker compose -f docker-compose.prod.yml pull postgres redis minio
```

---

## Процедура отката

### Быстрый откат (последний рабочий коммит)

```bash
# 1. Определите последний рабочий тег/коммит
git log --oneline -10

# 2. Восстановите код
git checkout <commit-hash>

# 3. Пересоберите образы
docker compose -f docker-compose.prod.yml build

# 4. Восстановите БД из резервной копии (если миграции были применены)
docker compose exec -T postgres psql -U substack substack_db < backup_YYYYMMDD_HHMMSS.sql

# 5. Перезапустите сервисы
docker compose -f docker-compose.prod.yml up -d --no-deps backend frontend
```

### Откат базы данных

```bash
# Список доступных резервных копий
ls -la backups/

# Восстановление
docker compose exec -T postgres psql -U substack -d substack_db < backups/backup_20260429_100000.sql
```

---

## Карта портов

| Сервис | Порт | Описание |
|--------|------|----------|
| Backend (NestJS) | **3010** | REST API |
| Frontend (Next.js) | **3011** | Web UI |
| PostgreSQL | **5437** | База данных (нестандартный порт, избегает конфликтов) |
| Redis | **6380** | Кеш и очереди (нестандартный порт) |
| MinIO API | **9010** | S3-совместимое хранилище |
| MinIO Console | **9011** | Веб-интерфейс MinIO |

> Нестандартные порты используются для избежания конфликтов с другими Docker-контейнерами на общем сервере.
