# API - Tests

## Modified: 2026-01-15

### Test Setup

- Global config: `src/test/setup.ts`
- Mocks: `src/test/mocks/`
- Config: `vitest.config.ts` avec `setupFiles`

### Test Coverage

| Module | File | Tests | Status |
|--------|------|-------|--------|
| Utils | `app-error.spec.ts` | 4 | Done |
| Invitations | `service.spec.ts` | 25 | Done |
| Email Templates | `templates.spec.ts` | 14 | Done |
| Email Service | `email.service.spec.ts` | 5 | Done |
| Circuit Breaker | `circuit-breaker.spec.ts` | 6 | Done |

**Total: 54 tests**

### Mocks Disponibles

```typescript
// Models
import { createMockTenant, createMockUser, createMockInvitation, createMockGroup } from '../test/mocks/index.js';

// Email Service
import { emailServiceMock } from '../test/mocks/email.mock.js';
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

- [ ] Auth controller tests
- [ ] Auth middleware tests
- [ ] Password service tests
- [ ] Redis session tests

### Notes

- Tests sans DB réelle (mocks Sequelize)
- Logger supprimé pendant les tests
- Config mockée globalement
- Email service mocké avec tracking des emails envoyés
