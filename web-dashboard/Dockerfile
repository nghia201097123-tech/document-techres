# =============================================================
# Dockerfile for Web Dashboard (Next.js 15)
# =============================================================
#
# Build: docker build -t web-dashboard .
# Run:   docker run -p 8080:8080 \
#          -e NEXT_PUBLIC_API_URL=https://your-api.com \
#          -e NEXT_PUBLIC_API_APP_FOOD_URL=http://your-food-api.com/api \
#          -e CONFIG_RESOURCE_URL=https://your-api.com/s3 \
#          -e SERVICE_PORT=8080 \
#          web-dashboard
#
# IMPORTANT: NEXT_PUBLIC_* variables are inlined at build time.
# To change them at runtime, we use placeholder replacement via entrypoint.sh
# =============================================================

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set placeholder values for NEXT_PUBLIC_* variables at build time
# These will be replaced by entrypoint.sh at runtime
ENV NEXT_PUBLIC_API_URL=CONFIG_VALUE_NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_APP_FOOD_URL=CONFIG_VALUE_NEXT_PUBLIC_API_APP_FOOD_URL

# Build the application
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

# Install required tools for entrypoint script
RUN apk add --no-cache findutils

# Set environment
ENV NODE_ENV=production
ENV SERVICE_PORT=8080

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/scripts ./scripts

# Make entrypoint executable
RUN chmod +x ./scripts/entrypoint.sh

# Set correct permissions for .next directory (needed for placeholder replacement)
RUN chown -R nextjs:nodejs ./.next

USER nextjs

EXPOSE 8080

# Use entrypoint to replace placeholders before starting
ENTRYPOINT ["./scripts/entrypoint.sh"]
CMD ["node", "server.js"]
