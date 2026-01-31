-- Add refund request fields to purchases table
-- Supports the refund request workflow:
-- - < 1 hour after purchase: automatic refund
-- - > 1 hour: requires admin approval

-- Add refund request status enum
DO $$ BEGIN
    CREATE TYPE refund_request_status AS ENUM ('none', 'pending', 'approved', 'rejected', 'auto_approved');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add refund request fields
ALTER TABLE purchases
ADD COLUMN IF NOT EXISTS refund_request_status refund_request_status DEFAULT 'none' NOT NULL,
ADD COLUMN IF NOT EXISTS refund_requested_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS refund_request_reason TEXT,
ADD COLUMN IF NOT EXISTS refund_reviewed_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS refund_reviewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS refund_rejection_reason TEXT;

-- Index for finding pending refund requests
CREATE INDEX IF NOT EXISTS idx_purchases_refund_request_status
ON purchases(refund_request_status)
WHERE refund_request_status = 'pending';

COMMENT ON COLUMN purchases.refund_request_status IS 'Status of refund request: none, pending (awaiting admin), approved, rejected, auto_approved (within 1h)';
COMMENT ON COLUMN purchases.refund_requested_at IS 'When the user requested a refund';
COMMENT ON COLUMN purchases.refund_request_reason IS 'Reason provided by user for refund request';
COMMENT ON COLUMN purchases.refund_reviewed_by IS 'Admin who reviewed the request';
COMMENT ON COLUMN purchases.refund_reviewed_at IS 'When the request was reviewed';
COMMENT ON COLUMN purchases.refund_rejection_reason IS 'Reason for rejection (if rejected)';
