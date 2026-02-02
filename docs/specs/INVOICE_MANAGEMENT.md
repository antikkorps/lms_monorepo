# Invoice Management B2B

> **Status**: Implemented
> **Last Updated**: 2026-02-02

## Overview

Invoice Management allows B2B tenant administrators to view and download invoices for their organization's billing activity (subscriptions and course licenses).

## Architecture

The implementation follows a **provider-agnostic pattern** to allow switching payment providers without modifying business logic.

```
┌──────────────────────┐
│  invoices.controller │  ← Koa controller
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   InvoiceProvider    │  ← Abstract interface
│     (interface)      │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│StripeInvoiceProvider │  ← Current implementation
└──────────────────────┘
```

### Switching Payment Providers

To switch from Stripe to another provider (e.g., Paddle, LemonSqueezy):

1. Create a new provider class implementing `InvoiceProvider`:
   ```typescript
   // services/invoices/paddle-invoice.provider.ts
   export class PaddleInvoiceProvider implements InvoiceProvider {
     async listInvoices(...) { /* Paddle API */ }
     async getInvoice(...) { /* Paddle API */ }
     // ...
   }
   ```

2. Update the export in `services/invoices/index.ts`:
   ```typescript
   const invoiceProvider: InvoiceProvider = new PaddleInvoiceProvider();
   ```

No changes needed in controllers or frontend.

## API Endpoints

All endpoints require authentication and tenant membership.

### List Invoices

```
GET /tenant/invoices
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 20 | Max invoices to return (1-100) |
| `status` | string | - | Filter: `paid`, `open`, `draft`, `void`, `uncollectible` |
| `startDate` | ISO date | - | Filter by creation date (from) |
| `endDate` | ISO date | - | Filter by creation date (to) |

**Response:**
```json
{
  "data": {
    "invoices": [
      {
        "id": "in_1234567890",
        "number": "INV-2024-001",
        "status": "paid",
        "currency": "EUR",
        "amountDue": 0,
        "amountPaid": 50000,
        "total": 50000,
        "createdAt": "2024-01-15T00:00:00Z",
        "dueDate": "2024-01-31T00:00:00Z",
        "paidAt": "2024-01-20T00:00:00Z",
        "description": "Monthly subscription",
        "hostedUrl": "https://invoice.stripe.com/..."
      }
    ],
    "pagination": {
      "total": 15,
      "hasMore": false
    }
  }
}
```

### Get Invoice Details

```
GET /tenant/invoices/:id
```

**Response:**
```json
{
  "data": {
    "id": "in_1234567890",
    "number": "INV-2024-001",
    "status": "paid",
    "currency": "EUR",
    "amountDue": 0,
    "amountPaid": 50000,
    "amountRemaining": 0,
    "subtotal": 50000,
    "total": 50000,
    "tax": null,
    "createdAt": "2024-01-15T00:00:00Z",
    "dueDate": "2024-01-31T00:00:00Z",
    "paidAt": "2024-01-20T00:00:00Z",
    "periodStart": "2024-01-01T00:00:00Z",
    "periodEnd": "2024-01-31T00:00:00Z",
    "description": "Monthly subscription - 25 seats",
    "hostedUrl": "https://invoice.stripe.com/...",
    "pdfUrl": "https://...",
    "lines": [
      {
        "id": "il_123",
        "description": "Professional Plan - 25 seats",
        "quantity": 25,
        "unitAmount": 2000,
        "amount": 50000,
        "currency": "EUR"
      }
    ],
    "metadata": {}
  }
}
```

### Get Invoice PDF

```
GET /tenant/invoices/:id/pdf
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `redirect` | boolean | false | If `true`, redirects to PDF URL |

**Response (redirect=false):**
```json
{
  "data": {
    "url": "https://invoice.stripe.com/..."
  }
}
```

**Response (redirect=true):**
HTTP 302 redirect to PDF URL.

## Types

### InvoiceStatus

```typescript
type InvoiceStatus = 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';
```

### Invoice

```typescript
interface Invoice {
  id: string;
  number: string | null;
  status: InvoiceStatus;
  currency: string;
  amountDue: number;      // In cents
  amountPaid: number;     // In cents
  amountRemaining: number;
  subtotal: number;
  total: number;
  tax: number | null;
  createdAt: Date;
  dueDate: Date | null;
  paidAt: Date | null;
  periodStart: Date | null;
  periodEnd: Date | null;
  description: string | null;
  hostedUrl: string | null;
  pdfUrl: string | null;
  lines: InvoiceLineItem[];
  metadata: Record<string, string>;
}
```

### InvoiceProvider Interface

```typescript
interface InvoiceProvider {
  listInvoices(customerId: string, options?: InvoiceListOptions): Promise<InvoiceListResult>;
  getInvoice(invoiceId: string): Promise<Invoice>;
  getInvoicePdfUrl(invoiceId: string): Promise<string | null>;
  verifyInvoiceOwnership(invoiceId: string, customerId: string): Promise<boolean>;
}
```

## Frontend

### Route

```
/admin/invoices
```

Accessible to `tenant_admin` and `super_admin` roles.

### Composable

```typescript
import { useTenantInvoices } from '@/composables/useTenantInvoices';

const {
  invoices,
  isLoading,
  error,
  fetchInvoices,
  downloadInvoicePdf,
  formatAmount,
  formatDate,
  getStatusColor,
} = useTenantInvoices();
```

### Features

- List all invoices with status badges
- Filter by status (paid, open, draft, void)
- Summary cards (total invoices, paid amount, open invoices)
- Download PDF button
- View on Stripe button (opens hosted invoice page)
- Responsive table design
- i18n support (EN/FR)

## Security

- All endpoints require JWT authentication
- Tenant membership verified via `requireTenant` middleware
- Invoice ownership verified before returning data
- Stripe customer ID retrieved from Tenant model (never from client)

## Circuit Breaker

Stripe API calls are wrapped with the circuit breaker pattern:
- **Timeout**: 15 seconds
- **Error threshold**: 50%
- **Reset timeout**: 30 seconds
- **Volume threshold**: 5 requests minimum

## File Locations

| File | Purpose |
|------|---------|
| `libs/shared/types/src/invoice.types.ts` | Shared types |
| `apps/api/src/services/invoices/invoice.provider.ts` | Provider interface |
| `apps/api/src/services/invoices/stripe-invoice.provider.ts` | Stripe implementation |
| `apps/api/src/services/invoices/index.ts` | Provider export |
| `apps/api/src/tenant/invoices.controller.ts` | API controller |
| `apps/api/src/tenant/index.ts` | Route definitions |
| `apps/app/src/composables/useTenantInvoices.ts` | Vue composable |
| `apps/app/src/views/admin/InvoicesView.vue` | Vue page |
