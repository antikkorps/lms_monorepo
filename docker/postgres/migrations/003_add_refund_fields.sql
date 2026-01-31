-- Migration: Add refund fields to purchases table
-- Date: 2026-01-31

ALTER TABLE purchases
ADD COLUMN IF NOT EXISTS stripe_refund_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS refund_reason VARCHAR(500),
ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS is_partial_refund BOOLEAN DEFAULT false;

-- Add index for refund lookups
CREATE INDEX IF NOT EXISTS idx_purchases_stripe_refund_id
ON purchases(stripe_refund_id)
WHERE stripe_refund_id IS NOT NULL;

-- Add index for refunded purchases queries
CREATE INDEX IF NOT EXISTS idx_purchases_refunded_at
ON purchases(refunded_at)
WHERE refunded_at IS NOT NULL;
