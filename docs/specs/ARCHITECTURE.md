# LMS Platform Architecture Specification

## Modified: 2026-01-14

## 1. System Overview

### High-Level Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                        CDN (Cloudflare)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │   Landing   │    │     App     │    │     API     │        │
│  │   (Astro)   │    │    (Vue)    │    │    (Koa)    │        │
│  │   :4321     │    │    :5173    │    │    :3000    │        │
│  └─────────────┘    └─────────────┘    └──────┬──────┘        │
│                                               │                │
│                                    ┌──────────┴──────────┐    │
│                                    │                     │    │
│                             ┌──────┴──────┐       ┌──────┴──────┐
│                             │  PostgreSQL │       │    Redis    │
│                             │  (pgvector) │       │  (Cache/    │
│                             │    :5432    │       │   Session)  │
│                             └─────────────┘       └─────────────┘
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 2. Multi-Tenancy Architecture

### Row-Level Isolation (Default)
- Single database with `tenant_id` column on relevant tables
- Middleware validates tenant context on every request
- Future: Support for dedicated databases per large tenant

### Tenant Context Flow
```
Request → Extract Tenant (JWT/subdomain)
       → Validate Tenant Status
       → Attach DB Connection to Context
       → Process Request with Scoped Queries
```

### Database Strategy Pattern
```typescript
// Repository Pattern for future DB isolation
interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(data: CreateUserInput): Promise<User>;
}

// Shared DB Implementation (current)
class SharedUserRepository implements UserRepository { ... }

// Isolated DB Implementation (future)
class IsolatedUserRepository implements UserRepository { ... }

// Factory selects based on tenant config
function getUserRepository(ctx: Context): UserRepository {
  const tenant = ctx.state.tenant;
  if (tenant?.isolationStrategy === 'ISOLATED') {
    return new IsolatedUserRepository(tenant.connectionString);
  }
  return new SharedUserRepository();
}
```

## 3. Authentication & Authorization

### JWT Token Strategy
- Access Token: Short-lived (15min), contains identity only
- Refresh Token: Long-lived (7d), stored in HTTP-Only cookie
- Token refresh handled automatically by client

### Stateful Validation
```
JWT Decode → Redis Blacklist Check
          → Tenant Status Check
          → Seat Validity Check
          → Permission Check
          → Grant/Deny Access
```

### RBAC Roles
| Role | Scope | Capabilities |
|------|-------|-------------|
| super_admin | Global | Full platform management |
| tenant_admin | Tenant | Tenant management, billing |
| manager | Groups | Group user management |
| instructor | Courses | Content editing, grading |
| learner | Self | Course consumption |

## 4. External Service Integration

### Circuit Breaker Pattern
All external API calls must implement circuit breaker:
- Video streaming (Cloudflare Stream/Mux)
- Payment processing (Stripe)
- LLM services (future V2)

```typescript
const videoService = new CircuitBreaker(cloudflareStream, {
  timeout: 10000,
  errorThreshold: 5,
  resetTimeout: 30000
});
```

### Payment Adapter Pattern
```typescript
interface PaymentProvider {
  createCheckout(params: CheckoutParams): Promise<CheckoutSession>;
  handleWebhook(payload: unknown): Promise<WebhookResult>;
  createPortalSession(customerId: string): Promise<string>;
}

// Current implementation
class StripeProvider implements PaymentProvider { ... }

// Future: other providers
class PayPalProvider implements PaymentProvider { ... }
```

## 5. Data Models

### Core Entities
```
Users
├── id (UUID)
├── email (unique)
├── firstName, lastName
├── role (enum)
├── status (enum)
├── tenantId (nullable FK → Tenants)
├── passwordHash
├── lastLoginAt
└── timestamps

Tenants
├── id (UUID)
├── name, slug (unique)
├── status (enum)
├── isolationStrategy (SHARED/ISOLATED)
├── connectionString (nullable)
├── seatsPurchased, seatsUsed
├── subscriptionStatus (enum)
├── stripeCustomerId, stripeSubscriptionId
└── timestamps

Groups
├── id (UUID)
├── tenantId (FK → Tenants)
├── name, description
└── timestamps

Courses
├── id (UUID)
├── title, slug (unique)
├── description
├── status (enum)
├── price
├── instructorId (FK → Users)
├── duration
└── timestamps

Chapters, Lessons, QuizQuestions...
```

## 6. API Design

### Versioning
- Base path: `/api/v1/`
- Version in URL, not headers

### Response Format
```json
// Success
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "limit": 20, "total": 100 }
}

// Error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": { ... }
  }
}
```

### Rate Limiting
| Context | Window | Max Requests |
|---------|--------|-------------|
| B2C Auth | 1min | 10 |
| B2C API | 1min | 100 |
| B2B API | 1min | 1000 |
| Webhooks | None | Unlimited |

## 7. Caching Strategy

### Redis Usage
- Session blacklist (immediate revocation)
- Rate limit counters
- API response cache (where appropriate)
- Job queue (BullMQ)

### Cache Invalidation
- User-specific: On user update
- Tenant-specific: On tenant/seat update
- Course content: On publish

## 8. Security Measures

### Headers (Helmet.js)
- Content-Security-Policy
- X-Frame-Options
- X-Content-Type-Options
- Strict-Transport-Security

### Input Validation
- All inputs validated with Zod schemas
- Schemas shared between frontend and backend

### Soft Deletes
- User-related entities use `paranoid: true`
- Allows recovery of accidentally deleted data
