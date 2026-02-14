-- Migration: Add license expiration and renewal support
-- Adds expired status to purchase_status enum
-- Adds expiration columns to tenant_course_licenses

-- Add 'expired' to purchase_status enum
ALTER TYPE purchase_status ADD VALUE IF NOT EXISTS 'expired';

-- Add expiration columns
ALTER TABLE tenant_course_licenses
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS renewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS renewal_count INTEGER NOT NULL DEFAULT 0;

-- Conditional index for expiration checking (only non-null expires_at)
CREATE INDEX IF NOT EXISTS idx_licenses_expires_at
  ON tenant_course_licenses (expires_at)
  WHERE expires_at IS NOT NULL AND status = 'completed';
