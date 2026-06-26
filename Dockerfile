# ============================================
# Agrobase V3 — Production Dockerfile
# MobiPay AgroSys Limited
# Multi-stage, security-hardened, optimized for East Africa deployment
# ============================================

# --- Stage 1: Dependencies (layer-cached) ---
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Copy lockfiles first for cache optimization
COPY package.json package-lock.json* ./

# Install dependencies only (skip devDependencies in production)
RUN \
  if [ -f package-lock.json ]; then npm ci --omit=dev; \
  else npm install --omit=dev; \
  fi

# --- Stage 2: Build ---
FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Copy ALL dependencies (including dev) for build
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Next.js production build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NEXT_SKIP_TYPECHECK=true

RUN npm run build

# --- Stage 3: Production Runner (minimal attack surface) ---
FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat wget ca-certificates tzdata && \
    cp /usr/share/zoneinfo/Africa/Kampala /etc/localtime && \
    echo "Africa/Kampala" > /etc/timezone && \
    apk del tzdata

WORKDIR /app

# Create non-root user with restricted permissions
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs nextjs

# Set environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy standalone output (self-contained server)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy Prisma for runtime migrations
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# Switch to non-root user
USER nextjs

# Health check — verifies the server is responding
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Expose port
EXPOSE 3000

# Start with Node.js (standalone mode)
CMD ["node", "server.js"]