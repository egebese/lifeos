### --- deps ---
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable && \
    (pnpm install --frozen-lockfile || pnpm install --no-frozen-lockfile)

### --- builder ---
FROM node:20-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable && \
    pnpm drizzle-kit generate && \
    pnpm build

### --- runner ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN apk add --no-cache bash && \
    addgroup -S nodejs && adduser -S nextjs -G nodejs && \
    mkdir -p /data/uploads && chown -R nextjs:nodejs /data

# Next.js standalone output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Migrations + setup scripts (we still need tsx at runtime → keep node_modules of scripts deps)
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/lib ./lib
COPY --from=builder --chown=nextjs:nodejs /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./tsconfig.json
COPY --from=deps    --chown=nextjs:nodejs /app/node_modules ./node_modules-full

# Replace standalone's slim node_modules with the build's full one (needed for tsx-based scripts)
RUN rm -rf node_modules && mv node_modules-full node_modules

ENV UPLOADS_DIR=/data/uploads

USER nextjs
EXPOSE 3000

CMD ["sh", "-c", "node --import tsx scripts/migrate.ts && node --import tsx scripts/bootstrap-admin.ts && node --import tsx scripts/seed-exercises.ts && node --import tsx scripts/seed-templates.ts && node server.js"]
