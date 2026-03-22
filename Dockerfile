# ============================================================
# SIROPE — Multi-stage Dockerfile
# Sistema de Registro Optativo de Participantes de Estudios
# ============================================================
# Uso:
#   docker build -t sirope .
#   docker run -p 3000:3000 -v sirope-data:/app/data sirope
#
# O con docker-compose:
#   docker compose up -d
# ============================================================

# ---- Stage 1: Dependencies ----
FROM node:20-alpine AS deps
RUN apk add --no-cache python3 make g++ libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
# Rebuild native modules (better-sqlite3) for Alpine
RUN npm rebuild better-sqlite3

# ---- Stage 2: Build ----
FROM node:20-alpine AS builder
RUN apk add --no-cache python3 make g++ libc6-compat
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js (standalone output)
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- Stage 3: Runtime ----
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone build
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy Prisma schema + seed (needed for db push / seed at runtime)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=builder /app/node_modules/@prisma/adapter-better-sqlite3 ./node_modules/@prisma/adapter-better-sqlite3
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/node_modules/dotenv ./node_modules/dotenv
COPY --from=builder /app/node_modules/tsx ./node_modules/tsx

# Copy .env.example as fallback (user should mount .env)
COPY .env.example .env.example

# Create data directory for SQLite
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

# Entrypoint script
COPY <<'EOF' /app/entrypoint.sh
#!/bin/sh
set -e

# Use data volume for database
export DATABASE_URL="file:/app/data/sirope.db"

# Initialize database if it doesn't exist
if [ ! -f /app/data/sirope.db ]; then
  echo "🗄️  Initializing database..."
  npx prisma db push --skip-generate
  echo "✅ Database created"

  # Run seed if SEED_ON_INIT is set
  if [ "$SEED_ON_INIT" = "true" ]; then
    echo "🌱 Seeding database..."
    npx tsx prisma/seed.ts
    echo "✅ Seed complete"
  fi
fi

echo "🚀 Starting SIROPE on port ${PORT:-3000}..."
exec node server.js
EOF
RUN chmod +x /app/entrypoint.sh

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["/app/entrypoint.sh"]
