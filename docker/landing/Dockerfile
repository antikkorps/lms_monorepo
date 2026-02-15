# =============================================================================
# Landing Dockerfile - Astro
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
COPY apps/landing/package.json ./apps/landing/

# -----------------------------------------------------------------------------
# Development stage - With hot-reload
# -----------------------------------------------------------------------------
FROM base AS development

# Install all dependencies
RUN npm ci

# Copy Nx configuration
COPY nx.json tsconfig.base.json ./

# Copy source code
COPY apps/landing ./apps/landing
COPY libs ./libs

# Expose Astro dev server port
EXPOSE 4321

# Default command
CMD ["npx", "nx", "serve", "landing", "--host", "0.0.0.0"]

# -----------------------------------------------------------------------------
# Builder stage - Build for production
# -----------------------------------------------------------------------------
FROM base AS builder

# Install all dependencies
RUN npm ci

# Copy all source files
COPY . .

# Build the landing page
RUN npx nx build landing --configuration=production

# -----------------------------------------------------------------------------
# Production stage - Serve static files with nginx
# -----------------------------------------------------------------------------
FROM nginx:alpine AS production

# Copy built files to nginx
COPY --from=builder /app/dist/apps/landing /usr/share/nginx/html

# Copy nginx configuration
COPY docker/landing/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
