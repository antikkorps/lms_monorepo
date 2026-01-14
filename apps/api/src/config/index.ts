export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),

  // Database
  databaseUrl: process.env.DATABASE_URL || 'postgres://lms:lms@localhost:5433/lms',

  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  // Stripe
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',

  // CORS
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173').split(','),

  // Rate limiting (defaults, can be overridden per tier in middleware)
  rateLimit: {
    b2c: {
      windowMs: parseInt(process.env.RATE_LIMIT_B2C_WINDOW_MS || '60000', 10),
      maxRequests: parseInt(process.env.RATE_LIMIT_B2C_MAX || '100', 10),
    },
    b2b: {
      windowMs: parseInt(process.env.RATE_LIMIT_B2B_WINDOW_MS || '60000', 10),
      maxRequests: parseInt(process.env.RATE_LIMIT_B2B_MAX || '500', 10),
    },
    b2bPremium: {
      windowMs: parseInt(process.env.RATE_LIMIT_B2B_PREMIUM_WINDOW_MS || '60000', 10),
      maxRequests: parseInt(process.env.RATE_LIMIT_B2B_PREMIUM_MAX || '1000', 10),
    },
    auth: {
      windowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS || '60000', 10),
      maxRequests: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '10', 10),
    },
  },
} as const;

export type Config = typeof config;
