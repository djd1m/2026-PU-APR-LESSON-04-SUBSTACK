# SubStack RU

Российская платформа для независимых создателей контента. Full clone Substack с локальными платежами, комплаенсом 152-ФЗ и Yandex SEO.

## Stack

Next.js 15 + NestJS 10 + PostgreSQL 16 + Redis 7 + Resend + CloudPayments

## Quick Start

```bash
# 1. Clone and configure
git clone <repo-url> && cd substack-ru
cp .env.example .env  # fill in secrets

# 2. Start services
docker compose up -d

# 3. Initialize database
npx prisma migrate dev --name init
npx prisma db seed

# 4. Open
open http://localhost:3000
```

## Development with Claude Code

```bash
/start          # bootstrap project from SPARC docs
/run mvp        # auto-implement all MVP features
/run all        # auto-implement ALL features
/next           # see what to work on
/go <feature>   # implement single feature (auto-selects pipeline)
```

## Documentation

- [PRD](docs/PRD.md) — product requirements
- [Architecture](docs/Architecture.md) — system design
- [Development Guide](DEVELOPMENT_GUIDE.md) — workflows and commands
- [Full docs](docs/) — SPARC documentation package

## License

Private. All rights reserved.
