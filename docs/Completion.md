# Completion: Russian Newsletter Platform

**Дата:** 2026-04-22 | **Фаза:** SPARC Phase 7

---

## 1. Pre-Deployment Checklist

### Code Quality
- [ ] All unit tests passing (> 80% coverage for business logic)
- [ ] Integration tests passing
- [ ] E2E tests passing (4 critical journeys)
- [ ] No critical/high vulnerabilities (`npm audit`)
- [ ] TypeScript strict mode, no `any` in production code
- [ ] Linting clean (ESLint + Prettier)

### Security
- [ ] OWASP Top 10 review completed
- [ ] Rate limiting configured and tested
- [ ] Webhook signature verification tested
- [ ] CORS whitelist configured
- [ ] CSP headers configured
- [ ] All secrets in environment variables (none in code)
- [ ] SSL/TLS certificates installed (Let's Encrypt)

### Infrastructure
- [ ] VPS provisioned (app-01, db-01, storage-01) in Russia
- [ ] Docker + Docker Compose installed
- [ ] Firewall configured (only 80, 443, 22 open)
- [ ] SSH key-only auth (password disabled)
- [ ] Automated backups configured and tested
- [ ] Monitoring stack deployed (Prometheus + Grafana + Sentry)

### Data
- [ ] Database migrations tested on staging
- [ ] Seed data prepared (admin user, test publication)
- [ ] Backup → restore procedure tested
- [ ] Redis persistence configured

### External Services
- [ ] CloudPayments merchant account active, webhook URL configured
- [ ] СБП gateway account active
- [ ] YooKassa account active (fallback)
- [ ] Resend account active, domain verified, SPF/DKIM/DMARC set
- [ ] Email warm-up plan started (2 weeks before launch)
- [ ] Yandex Webmaster account connected, sitemap submitted
- [ ] Sentry project created, DSN configured

---

## 2. Deployment Sequence

### Initial Deployment

```bash
# 1. Provision VPS servers (AdminVPS/HOSTKEY)
ssh root@app-01
apt update && apt install docker.io docker-compose-v2 -y

# 2. Clone repository
git clone https://github.com/{org}/substack-ru.git /app
cd /app

# 3. Configure environment
cp .env.example .env
# Edit .env: DATABASE_URL, REDIS_URL, CLOUDPAYMENTS_*, SENDPULSE_*, etc.

# 4. Build and start
docker compose build
docker compose up -d

# 5. Run migrations
docker compose exec app npx prisma migrate deploy

# 6. Create admin user
docker compose exec app npx ts-node scripts/create-admin.ts

# 7. Verify
curl -I https://app.example.com/api/health
# Expected: HTTP 200 {"status":"ok","db":"connected","redis":"connected"}

# 8. Submit sitemap to Yandex
curl https://app.example.com/sitemap.xml  # verify it renders
```

### Update Deployment (CI/CD)

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: test
          POSTGRES_PASSWORD: test
      redis:
        image: redis:7
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run lint
      - run: npm run test
      - run: npm run test:e2e

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to VPS
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: deploy
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /app
            git pull origin main
            docker compose build --no-cache app worker
            docker compose up -d app worker scheduler
            docker compose exec -T app npx prisma migrate deploy
            # Health check
            sleep 10
            curl -sf http://localhost:3000/api/health || exit 1
```

### Rollback Procedure

```bash
# 1. Identify bad commit
git log --oneline -5

# 2. Revert to previous working version
git revert HEAD
git push origin main
# CI/CD will auto-deploy the revert

# OR manual rollback:
ssh deploy@app-01
cd /app
git checkout <last-good-commit>
docker compose build app worker
docker compose up -d app worker scheduler
docker compose exec -T app npx prisma migrate deploy
```

---

## 3. Monitoring & Alerting

### Key Metrics

| Metric | Source | Threshold | Alert Channel |
|--------|--------|-----------|---------------|
| API response time p99 | Prometheus | > 500ms for 5 min | Email |
| API error rate (5xx) | Prometheus | > 1% for 5 min | Email |
| Email queue depth | Bull dashboard | > 10,000 for 15 min | Email |
| Email bounce rate | Resend webhook | > 5% daily | Email |
| PostgreSQL connections | pg_stat_activity | > 80% of max | Email |
| Disk usage | node_exporter | > 85% | Email |
| CPU usage | node_exporter | > 90% for 10 min | Email |
| RAM usage | node_exporter | > 90% for 10 min | Email |
| SSL certificate expiry | blackbox_exporter | < 14 days | Email |
| Payment webhook failures | Application logs | > 3 in 1 hour | Email |

### Grafana Dashboards

| Dashboard | Panels |
|-----------|--------|
| Platform Overview | Users, MRR, articles/day, emails/day |
| API Performance | Response time, error rate, request rate |
| Email Delivery | Queue depth, delivery rate, bounce rate, open rate |
| Infrastructure | CPU, RAM, disk, network per server |
| Payments | Successful/failed payments, revenue, processor status |

---

## 4. Logging Strategy

### Log Levels

| Level | Usage | Example |
|-------|-------|---------|
| error | Unexpected failures | Payment webhook signature invalid |
| warn | Expected but noteworthy | Subscriber email bounced |
| info | Business events | Article published, subscription created |
| debug | Development details | Query execution time, cache hit/miss |

### Log Format (structured JSON)

```json
{
  "timestamp": "2026-04-22T10:30:00Z",
  "level": "info",
  "service": "api",
  "event": "article.published",
  "articleId": "uuid",
  "publicationId": "uuid",
  "subscribersQueued": 500,
  "duration": 230
}
```

### Retention

| Log type | Retention | Storage |
|----------|-----------|---------|
| Application logs | 30 days | Loki |
| Access logs (Nginx) | 14 days | Loki |
| Audit logs (auth, payments) | 365 days | PostgreSQL |
| Error tracking | 90 days | Sentry |

---

## 5. Handoff Checklists

### For Development Team

- [ ] Repository access (GitHub, with branch protection on `main`)
- [ ] Development environment: `docker compose -f docker-compose.dev.yml up`
- [ ] `.env.example` with all required variables documented
- [ ] README.md with setup instructions
- [ ] Contributing guide (PR process, commit conventions)
- [ ] Architecture.md и Pseudocode.md как reference

### For Operations

- [ ] VPS access (SSH keys, jump host if applicable)
- [ ] Monitoring access (Grafana, Sentry)
- [ ] Runbooks:
  - [ ] How to restart a service
  - [ ] How to check logs
  - [ ] How to rollback a deploy
  - [ ] How to restore from backup
  - [ ] How to scale email workers
- [ ] Incident response process documented
- [ ] On-call rotation (if applicable)

### For Business / Legal

- [ ] Privacy Policy published (152-ФЗ compliant)
- [ ] Terms of Service published
- [ ] Cookie consent banner implemented
- [ ] Roskomnadzor notification about PD processing filed
- [ ] Payment processor agreements signed
- [ ] ООО / ИП registered, bank account opened

---

## 6. Launch Plan

### Week -2: Soft Launch Prep
- [ ] Email warm-up in progress (Resend)
- [ ] Invite 5-10 beta authors (0% take rate)
- [ ] Beta authors publish 2-3 articles each
- [ ] Monitor deliverability, fix issues

### Week -1: Beta
- [ ] Expand to 20-50 authors
- [ ] Test paid subscriptions with real payments
- [ ] Fix critical bugs
- [ ] Load test with expected launch traffic

### Week 0: Public Launch
- [ ] Remove beta restrictions
- [ ] Announce on VK, Habr, vc.ru
- [ ] Monitor metrics hourly for first 24h
- [ ] Be ready for hotfixes

### Week +1: Stabilization
- [ ] Collect author feedback
- [ ] Fix UX issues
- [ ] Optimize email deliverability
- [ ] First payout cycle to beta authors

---

*SPARC Phase 7: Completion. Deployment pipeline, CI/CD, monitoring, logging, launch plan, handoff checklists.*
