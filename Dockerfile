# ============================================
# SubStack RU — Multi-stage Dockerfile
# ============================================

# --- Base ---
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat curl
WORKDIR /app

# --- Dependencies ---
FROM base AS deps
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/backend/package.json ./packages/backend/
COPY packages/frontend/package.json ./packages/frontend/
RUN npm ci --workspace=packages/shared --workspace=packages/backend --workspace=packages/frontend

# --- Build ---
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/backend/node_modules ./packages/backend/node_modules
COPY --from=deps /app/packages/frontend/node_modules ./packages/frontend/node_modules
COPY . .
RUN npm run build --workspaces

# --- App (API + Frontend) ---
FROM base AS app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/backend/dist ./packages/backend/dist
COPY --from=build /app/packages/frontend/.next ./packages/frontend/.next
COPY --from=build /app/packages/frontend/public ./packages/frontend/public
COPY --from=build /app/packages/backend/prisma ./packages/backend/prisma
COPY --from=build /app/package.json ./
EXPOSE 3000
CMD ["node", "packages/backend/dist/main.js"]

# --- Worker (Background jobs) ---
FROM base AS worker
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/backend/dist ./packages/backend/dist
COPY --from=build /app/packages/backend/prisma ./packages/backend/prisma
COPY --from=build /app/package.json ./
CMD ["node", "packages/backend/dist/worker.js"]

# --- Scheduler (Cron jobs) ---
FROM base AS scheduler
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/backend/dist ./packages/backend/dist
COPY --from=build /app/packages/backend/prisma ./packages/backend/prisma
COPY --from=build /app/package.json ./
CMD ["node", "packages/backend/dist/scheduler.js"]
