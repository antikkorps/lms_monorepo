export const APP_NAME = 'IQON-IA';

export const config = {
  appName: APP_NAME,
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

  // Email
  email: {
    provider: process.env.EMAIL_PROVIDER || 'console', // 'console' | 'postmark' | 'sendgrid' | 'mailjet'
    from: process.env.EMAIL_FROM || 'noreply@example.com',
    fromName: process.env.EMAIL_FROM_NAME || 'IQON-IA',
    postmarkApiKey: process.env.POSTMARK_API_KEY || '',
    sendgridApiKey: process.env.SENDGRID_API_KEY || '',
    mailjetApiKey: process.env.MAILJET_API_KEY || '',
    mailjetApiSecret: process.env.MAILJET_API_SECRET || '',
    mailjetContactListId: process.env.MAILJET_CONTACT_LIST_ID || '',
  },

  // SSO (OAuth2/OpenID Connect)
  sso: {
    // Callback URL for OAuth providers
    callbackUrl: process.env.SSO_CALLBACK_URL || 'http://localhost:3000/api/v1/auth/sso/callback',
    // Google OAuth
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    },
    // Microsoft Entra ID (Azure AD)
    microsoft: {
      clientId: process.env.MICROSOFT_CLIENT_ID || '',
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
      tenantId: process.env.MICROSOFT_TENANT_ID || 'common', // 'common', 'organizations', or specific tenant
    },
  },

  // Cloudflare (shared account ID for R2/Stream)
  cloudflare: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID || '',
    apiToken: process.env.CLOUDFLARE_API_TOKEN || '',
    webhookSecret: process.env.CLOUDFLARE_STREAM_WEBHOOK_SECRET || '',
  },

  // Storage (file uploads)
  storage: {
    provider: process.env.STORAGE_PROVIDER || 'local', // 'local' | 'r2'
    localPath: process.env.STORAGE_LOCAL_PATH || './uploads',
    r2AccessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    r2BucketName: process.env.R2_BUCKET_NAME || '',
    r2PublicUrl: process.env.R2_PUBLIC_URL || '',
  },

  // Queue (BullMQ)
  queue: {
    concurrency: Number.parseInt(process.env.QUEUE_CONCURRENCY || '5', 10),
    maxRetries: Number.parseInt(process.env.QUEUE_MAX_RETRIES || '3', 10),
    digestCron: process.env.DIGEST_CRON || '0 8 * * 1', // Monday 8am by default
  },

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
  // Licensing (B2B course licenses)
  licensing: {
    unlimitedMultiplier: 10,
    defaultDurationMonths: 12,
    enableExpiration: process.env.LICENSE_ENABLE_EXPIRATION === 'true',
    volumeDiscountTiers: [
      { minSeats: 50, discountPercent: 30 },
      { minSeats: 20, discountPercent: 20 },
      { minSeats: 10, discountPercent: 10 },
    ],
    expirationWarningDays: [30, 7],
  },
} as const;

export type Config = typeof config;

const DEV_DEFAULTS = [
  'dev-secret-change-in-production',
  'dev-refresh-secret-change-in-production',
];

function validateProductionConfig(): void {
  const secrets = [
    { name: 'JWT_SECRET', value: config.jwtSecret },
    { name: 'JWT_REFRESH_SECRET', value: config.jwtRefreshSecret },
  ];

  for (const { name, value } of secrets) {
    const isDevDefault = DEV_DEFAULTS.includes(value);
    const isTooShort = value.length < 32;

    if (config.env === 'production') {
      if (isDevDefault) {
        throw new Error(`${name} must not use the default development value in production`);
      }
      if (isTooShort) {
        throw new Error(`${name} must be at least 32 characters in production (got ${value.length})`);
      }
    } else {
      if (isDevDefault) {
        console.warn(`[config] WARNING: ${name} is using the default development value`);
      }
    }
  }
}

validateProductionConfig();
