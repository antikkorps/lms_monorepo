# =============================================================================
# API Dockerfile - Koa.js Backend
# =============================================================================

# -----------------------------------------------------------------------------
# Base stage - Common setup
# -----------------------------------------------------------------------------
FROM node:22-alpine AS base

WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache libc6-compat

# Copy package files
COPY package*.json ./
COPY apps/api/package.json ./apps/api/
COPY libs/shared/schemas/package.json ./libs/shared/schemas/
COPY libs/shared/types/package.json ./libs/shared/types/

# -----------------------------------------------------------------------------
# Development stage - With hot-reload
# -----------------------------------------------------------------------------
FROM base AS development

# Install all dependencies (including devDependencies)
RUN npm ci

# Copy Nx configuration
COPY nx.json tsconfig.base.json ./

# Copy source code
COPY apps/api ./apps/api
COPY libs ./libs

# Expose port
EXPOSE 3000

# Default command (can be overridden in docker-compose)
CMD ["npx", "nx", "serve", "api"]

# -----------------------------------------------------------------------------
# Builder stage - Build for production
# -----------------------------------------------------------------------------
FROM base AS builder

# Install all dependencies
RUN npm ci

# Copy all source files
COPY . .

# Build the API
RUN npx nx build api --configuration=production

# -----------------------------------------------------------------------------
# Production stage - Minimal runtime
# -----------------------------------------------------------------------------
FROM node:22-alpine AS production

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 api

# Copy built files
COPY --from=builder /app/dist/apps/api ./
COPY --from=builder /app/dist/apps/api/package.json ./

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Switch to non-root user
USER api

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/health || exit 1

# Start the application
CMD ["node", "main.mjs"]
