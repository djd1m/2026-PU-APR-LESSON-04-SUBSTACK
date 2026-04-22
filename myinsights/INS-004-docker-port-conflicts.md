# [INS-004] Docker port conflicts with other containers on shared server

**Date:** 2026-04-22
**Status:** Active
**Severity:** Medium
**Tags:** `docker`, `ports`, `infrastructure`, `deployment`
**Hits:** 1

## Error Signatures
```
EADDRINUSE
port already allocated
Bind for 0.0.0.0:XXXX failed
```

## Symptoms
`docker compose up` fails for PostgreSQL with "port already allocated" on port 5436.

## Diagnostic Steps
1. Ran `docker ps` to see existing containers and their port mappings
2. Found: 80/443 (Caddy), 3000 (aitrainer), 3002 (worldmonitor), 5433-5435 (other Postgres), 6379 (Redis), 8000, 8088

## Root Cause
Server runs multiple projects in Docker. Standard ports (5432, 6379, 3000, 80, 443) and even offset ports (5436) are already taken.

## Solution
Used unique high-offset ports:
- App: **3010** (internal 3000)
- PostgreSQL: **5437** (was 5436, conflict with another project)
- Redis: **6380**
- MinIO API: **9010**, Console: **9011**
- Removed nginx (Caddy already on 80/443)

## Prevention
- Before choosing ports: `docker ps --format "table {{.Names}}\t{{.Ports}}"` to see occupied ports
- Use `docker compose` project name (`name: substackru`) to namespace containers
- Document port allocations per project in a shared file on the server
- Consider using Docker network-only (no port exposure) + reverse proxy for web access
