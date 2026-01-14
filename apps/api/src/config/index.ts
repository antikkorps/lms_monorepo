export const config = {
  env: process.env.NODE_ENV || 'development',
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number.parseInt(process.env.PORT || '3000', 10),

  // Frontend URL (for password reset links, etc.)
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  // Database
  databaseUrl: process.env.DATABASE_URL || 'postgres://lms:lms@localhost:5433/lms',

  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production',
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  // Cookie settings
  cookieSecure: process.env.NODE_ENV === 'production',
  cookieDomain: process.env.COOKIE_DOMAIN || undefined,

  // Stripe
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',

  // CORS
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173').split(','),

  // Rate limiting (defaults, can be overridden per tier in middleware)
  rateLimit: {
    b2c: {
      windowMs: Number.parseInt(process.env.RATE_LIMIT_B2C_WINDOW_MS || '60000', 10),
      maxRequests: Number.parseInt(process.env.RATE_LIMIT_B2C_MAX || '100', 10),
    },
    b2b: {
      windowMs: Number.parseInt(process.env.RATE_LIMIT_B2B_WINDOW_MS || '60000', 10),
      maxRequests: Number.parseInt(process.env.RATE_LIMIT_B2B_MAX || '500', 10),
    },
    b2bPremium: {
      windowMs: Number.parseInt(process.env.RATE_LIMIT_B2B_PREMIUM_WINDOW_MS || '60000', 10),
      maxRequests: Number.parseInt(process.env.RATE_LIMIT_B2B_PREMIUM_MAX || '1000', 10),
    },
    auth: {
      windowMs: Number.parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS || '60000', 10),
      maxRequests: Number.parseInt(process.env.RATE_LIMIT_AUTH_MAX || '10', 10),
    },
  },
} as const;

export type Config = typeof config;
