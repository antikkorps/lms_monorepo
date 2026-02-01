-- Migration: Create B2B course license tables
-- Date: 2026-02-01

-- License type enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'license_type') THEN
        CREATE TYPE license_type AS ENUM ('unlimited', 'seats');
    END IF;
END$$;

-- Tenant course licenses table
CREATE TABLE IF NOT EXISTS tenant_course_licenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    purchased_by_id UUID NOT NULL REFERENCES users(id),

    -- License details
    license_type license_type NOT NULL,
    seats_total INTEGER, -- NULL for unlimited
    seats_used INTEGER NOT NULL DEFAULT 0,

    -- Payment details
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    status purchase_status NOT NULL DEFAULT 'pending',
    stripe_payment_intent_id VARCHAR(255),
    stripe_checkout_session_id VARCHAR(255),
    stripe_invoice_id VARCHAR(255),
    purchased_at TIMESTAMP WITH TIME ZONE,

    -- Refund fields
    stripe_refund_id VARCHAR(255),
    refunded_at TIMESTAMP WITH TIME ZONE,
    refund_reason VARCHAR(500),
    refund_amount DECIMAL(10, 2),
    is_partial_refund BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- License assignment table (for seats-based licenses)
CREATE TABLE IF NOT EXISTS tenant_course_license_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_id UUID NOT NULL REFERENCES tenant_course_licenses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_by_id UUID NOT NULL REFERENCES users(id),
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Prevent duplicate assignments
    UNIQUE (license_id, user_id)
);

-- Indexes for tenant_course_licenses
CREATE INDEX IF NOT EXISTS idx_tenant_course_licenses_tenant ON tenant_course_licenses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_course_licenses_course ON tenant_course_licenses(course_id);
CREATE INDEX IF NOT EXISTS idx_tenant_course_licenses_tenant_course ON tenant_course_licenses(tenant_id, course_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_course_licenses_session ON tenant_course_licenses(stripe_checkout_session_id)
    WHERE stripe_checkout_session_id IS NOT NULL;

-- Indexes for license assignments
CREATE INDEX IF NOT EXISTS idx_license_assignments_license ON tenant_course_license_assignments(license_id);
CREATE INDEX IF NOT EXISTS idx_license_assignments_user ON tenant_course_license_assignments(user_id);

-- Updated at trigger for tenant_course_licenses
CREATE OR REPLACE FUNCTION update_tenant_course_licenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_tenant_course_licenses_updated_at ON tenant_course_licenses;
CREATE TRIGGER trigger_update_tenant_course_licenses_updated_at
    BEFORE UPDATE ON tenant_course_licenses
    FOR EACH ROW
    EXECUTE FUNCTION update_tenant_course_licenses_updated_at();

-- Updated at trigger for license assignments
DROP TRIGGER IF EXISTS trigger_update_license_assignments_updated_at ON tenant_course_license_assignments;
CREATE TRIGGER trigger_update_license_assignments_updated_at
    BEFORE UPDATE ON tenant_course_license_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_tenant_course_licenses_updated_at();
