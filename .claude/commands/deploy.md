---
description: Deploy SubStack RU to staging or production via Docker Compose on VPS Russia.
  Runs pre-deployment checklist, builds images, and deploys via SSH.
  $ARGUMENTS: "staging" (default) | "production" | "rollback"
---

# /deploy $ARGUMENTS

## Overview

Deployment orchestrator for SubStack RU on AdminVPS/HOSTKEY infrastructure.
Deploys via Docker Compose over SSH. Two environment tiers: staging and production.

> **BLOCKING RULES:**
> - NEVER deploy to production without passing all pre-deployment checks
> - NEVER skip the pre-deployment checklist
> - ALWAYS run tests before deploying
> - ALWAYS create a git tag before production deploy
> - FORBIDDEN: deploying with uncommitted changes

## Step 1: Parse Environment

```
IF $ARGUMENTS == "production" OR $ARGUMENTS == "prod":
    env = "production"
    vps_host = $PROD_VPS_HOST (from .env)
    require_manual_confirmation = true

IF $ARGUMENTS == "staging" OR $ARGUMENTS == "" (default):
    env = "staging"
    vps_host = $STAGING_VPS_HOST (from .env)
    require_manual_confirmation = false

IF $ARGUMENTS == "rollback":
    → Execute rollback procedure (see Rollback section)
```

## Step 2: Pre-Deployment Checklist

Run ALL checks before deploying. ABORT on any failure.

### Code Quality
- [ ] All tests pass: `npm test --workspaces --if-present`
- [ ] No TypeScript errors: `npm run type-check --workspaces --if-present`
- [ ] No uncommitted changes: `git status --porcelain`
- [ ] On correct branch:
  - staging: any branch is OK
  - production: must be on `main` branch

### Environment Configuration
- [ ] `.env.production` or `.env.staging` exists
- [ ] `RESEND_API_KEY` is set and not a placeholder
- [ ] `DATABASE_URL` points to correct environment database
- [ ] `REDIS_URL` points to correct environment Redis
- [ ] `NEXTAUTH_SECRET` is set (min 32 chars)
- [ ] `NEXT_PUBLIC_APP_URL` is set to correct domain

### Docker & Infrastructure
- [ ] `docker-compose.yml` exists and valid: `docker compose config -q`
- [ ] VPS SSH connection works: `ssh -o ConnectTimeout=10 $Vps_HOST "echo ok"`
- [ ] Disk space sufficient on VPS: `ssh $VPS_HOST "df -h /"`

### Documentation (from Completion.md checklist)
- [ ] CHANGELOG updated for this release
- [ ] Database migrations are backwards-compatible

Display checklist results:
```
═══════════════════════════════════════════════════════════
📋 Pre-Deployment Checklist: [environment]
═══════════════════════════════════════════════════════════

✅ Tests pass (XX passed)
✅ TypeScript clean
✅ No uncommitted changes
✅ Branch: main
✅ RESEND_API_KEY configured
✅ DATABASE_URL configured
✅ SSH connection OK
✅ Disk: XX% used

[X] FAILED: [item] — [reason]
═══════════════════════════════════════════════════════════
```

If production: request explicit confirmation:
```
⚠️  PRODUCTION DEPLOY — confirm with "deploy production" to proceed
```

## Step 3: Build

```bash
# Build Docker images locally
docker compose build --no-cache

# Tag images with git sha
GIT_SHA=$(git rev-parse --short HEAD)
docker tag substack-ru-api:latest substack-ru-api:${GIT_SHA}
docker tag substack-ru-web:latest substack-ru-web:${GIT_SHA}
```

## Step 4: Deploy to VPS

```bash
# Copy updated docker-compose.yml and .env to VPS
scp docker-compose.yml ${VPS_HOST}:~/substack-ru/
scp .env.${ENV} ${VPS_HOST}:~/substack-ru/.env

# Save current running image tags (for rollback)
ssh ${VPS_HOST} "cd ~/substack-ru && docker compose ps -q > .previous-containers"

# Pull and restart services with zero-downtime
ssh ${VPS_HOST} "cd ~/substack-ru && \
  docker compose pull && \
  docker compose up -d --remove-orphans"

# Wait for health checks
ssh ${VPS_HOST} "cd ~/substack-ru && \
  docker compose ps"
```

## Step 5: Post-Deploy Verification

```bash
# Health check API
curl -f https://${APP_DOMAIN}/api/health || echo "❌ API health check FAILED"

# Health check Web
curl -f https://${APP_DOMAIN}/ || echo "❌ Web health check FAILED"

# Check Redis connection
ssh ${VPS_HOST} "docker compose exec api npm run health:redis" 2>/dev/null

# Check DB connection
ssh ${VPS_HOST} "docker compose exec api npm run health:db" 2>/dev/null

# Run database migrations (if any pending)
ssh ${VPS_HOST} "cd ~/substack-ru && \
  docker compose exec api npx typeorm migration:run"
```

## Step 6: Tag and Report

```bash
# For production deploys: create git tag
IF env == "production":
    VERSION=$(node -p "require('./package.json').version")
    git tag "v${VERSION}-$(date +%Y%m%d)"
    git push origin --tags

# Report
```

```
🚀 Deploy complete: SubStack RU → [environment]

🌍 URL: https://[domain]
📦 Image: [git-sha]
🕐 Duration: Xs

✅ API health: OK
✅ Web health: OK
✅ DB connection: OK
✅ Redis connection: OK

💾 Git tag: v[version]-[date] (production only)

📊 Services:
  api:  running (port 3000)
  web:  running (port 3001)
  db:   running (PostgreSQL)
  redis: running
```

## Rollback: /deploy rollback

If the deploy causes issues:

```bash
# Step 1: Identify previous working state
ssh ${VPS_HOST} "cd ~/substack-ru && cat .previous-containers"

# Step 2: Roll back to previous images
ssh ${VPS_HOST} "cd ~/substack-ru && \
  docker compose down && \
  docker compose up -d --no-build"

# Step 3: Verify rollback
curl -f https://${APP_DOMAIN}/api/health

# Step 4: Report
echo "⏪ Rollback complete — running previous version"
```

## Environment Variables Reference

| Variable | staging | production |
|----------|---------|------------|
| `NODE_ENV` | `staging` | `production` |
| `DATABASE_URL` | staging DB | production DB |
| `REDIS_URL` | staging Redis | production Redis |
| `RESEND_API_KEY` | test key | live key |
| `NEXTAUTH_SECRET` | any 32+ chars | secure random |
| `NEXT_PUBLIC_APP_URL` | staging domain | production domain |

## Notes

- VPS provider: AdminVPS/HOSTKEY (Russia)
- Docker Compose direct deploy (no Kubernetes)
- Resend is used for all transactional emails — ensure API key is valid before deploy
- Redis is required for session management and job queues
- PostgreSQL migrations run automatically post-deploy
