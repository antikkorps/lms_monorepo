# API - Phase 3: Payments & Licensing

## Modified: 2026-02-02

### Completed

#### B2C Payments
- [x] Stripe checkout for course purchases (Done: 2026-01-25)
- [x] Webhook handling for checkout.session.completed (Done: 2026-01-25)
- [x] Purchase verification endpoint (Done: 2026-01-25)
- [x] Refund request system with auto-refund (< 1h) (Done: 2026-01-31)
- [x] Manual refund review for admin (Done: 2026-01-31)

#### B2B Tenant Subscriptions
- [x] Stripe subscription checkout for tenants (Done: 2026-01-26)
- [x] Customer portal for subscription management (Done: 2026-01-26)
- [x] Seat management (add/remove seats) (Done: 2026-01-26)
- [x] Subscription webhooks (created, updated, deleted) (Done: 2026-01-26)
- [x] Cancel/reactivate subscription (Done: 2026-01-26)

#### B2B Course Licensing (Done: 2026-02-01)
- [x] TenantCourseLicense model with unlimited/seats types
- [x] License checkout with card + bank transfer (SEPA)
- [x] Auto-create Stripe customer for new tenants
- [x] License assignment for seats-based licenses
- [x] Course access check via tenant license
- [x] License refund endpoint
- [x] Webhook handling for b2b_license payments
- [x] Database migration for license tables

### Completed - Invoice Management B2B (Done: 2026-02-02)
- [x] GET /tenant/invoices - Liste factures via Stripe API
- [x] GET /tenant/invoices/:id - Détail facture
- [x] GET /tenant/invoices/:id/pdf - URL vers PDF Stripe
- [x] Frontend: Page liste factures dashboard tenant
- [x] Architecture découplée avec InvoiceProvider interface (provider-agnostic)

### Pending

#### Future
- [ ] Volume discount tiers for large seat purchases
- [ ] License expiration/renewal (if time-limited)

### Notes

- B2C: Card payments only via Stripe Checkout
- B2B: Card + Bank Transfer (SEPA) via Stripe Checkout with customer_balance
- Unlimited license: 10x course price, all tenant members have access
- Seats license: Per-seat pricing with volume discounts (10%/20%/30%)
- Circuit Breaker pattern for all Stripe API calls
