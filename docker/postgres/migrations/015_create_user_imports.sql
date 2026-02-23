BEGIN;

-- Import status enum
DO $$ BEGIN
  CREATE TYPE import_status AS ENUM ('pending', 'processing', 'completed', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- User imports tracking table
CREATE TABLE IF NOT EXISTS user_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  imported_by_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status import_status NOT NULL DEFAULT 'pending',
  total_rows INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  file_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_imports_tenant_id ON user_imports (tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_imports_imported_by_id ON user_imports (imported_by_id);
CREATE INDEX IF NOT EXISTS idx_user_imports_status ON user_imports (status);

-- Updated at trigger
DROP TRIGGER IF EXISTS update_user_imports_updated_at ON user_imports;
CREATE TRIGGER update_user_imports_updated_at
  BEFORE UPDATE ON user_imports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;
