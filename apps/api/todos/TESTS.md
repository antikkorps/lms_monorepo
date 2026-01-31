# API - Tests

## Modified: 2026-01-31

### Test Setup

- Global config: `src/test/setup.ts`
- Mocks: `src/test/mocks/`
- Config: `vitest.config.ts` avec `setupFiles`

### Test Coverage

| Module | File | Tests | Status |
|--------|------|-------|--------|
| Utils | `app-error.spec.ts` | 4 | Done |
| Auth Password | `password.spec.ts` | 13 | Done |
| Auth JWT | `jwt.spec.ts` | 18 | Done |
| Auth Middleware | `middleware.spec.ts` | 23 | Done |
| Invitations | `service.spec.ts` | 25 | Done |
| Email Templates | `templates.spec.ts` | 14 | Done |
| Email Service | `email.service.spec.ts` | 5 | Done |
| Circuit Breaker | `circuit-breaker.spec.ts` | 6 | Done |
| Storage Validation | `storage/index.spec.ts` | 5 | Done |
| Local Storage | `storage/local.storage.spec.ts` | 12 | Done |
| Storage Integration | `storage/storage.integration.spec.ts` | 8 | Skipped* |
| Course Access | `utils/course-access.spec.ts` | 25 | Done |
| Course Access MW | `middlewares/course-access.middleware.spec.ts` | 13 | Done |
| Refund | `payments/refund.spec.ts` | 13 | Done |
| Courses Controller | `courses/controller.spec.ts` | 57 | Done |
| Notifications Controller | `notifications/controller.spec.ts` | 12 | Done |
| Notification Service | `services/notifications/notification.service.spec.ts` | 18 | Done |
| Preference Service | `services/notifications/preference.service.spec.ts` | 10 | Done |
| Notification Worker | `queue/workers/notification.worker.spec.ts` | 8 | Done |
| Certificate Generator | `certificates/generator.spec.ts` | 6 | Done |

**Total: 301 tests** (293 passed, 8 skipped)

*Integration tests: run with `R2_INTEGRATION_TEST=true`

### Mocks Disponibles

```typescript
// Models
import { createMockTenant, createMockUser, createMockInvitation, createMockGroup } from '../test/mocks/index.js';

// Email Service
import { emailServiceMock } from '../test/mocks/email.mock.js';

// Koa Context
import { createMockContext, createMockNext } from '../test/mocks/koa.mock.js';
```

### Running Tests

```bash
# Run all API tests
cd apps/api && npx vitest run

# Watch mode
cd apps/api && npx vitest

# With coverage
cd apps/api && npx vitest run --coverage
```

### Pending Tests

- [ ] Auth controller tests (complex, many endpoints)
- [ ] Redis session tests (requires Redis mock)

### Notes

- Tests sans DB réelle (mocks Sequelize)
- Logger supprimé pendant les tests
- Config mockée globalement
- Email service mocké avec tracking des emails envoyés
