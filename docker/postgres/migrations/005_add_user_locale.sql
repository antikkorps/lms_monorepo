-- Migration: Add locale column to users table
-- Description: Adds user language preference for i18n notifications and emails

-- Add locale column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS locale VARCHAR(5) DEFAULT 'en' NOT NULL;

-- Add constraint for valid locales (en, fr)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_users_locale'
    ) THEN
        ALTER TABLE users
        ADD CONSTRAINT chk_users_locale CHECK (locale IN ('en', 'fr'));
    END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN users.locale IS 'User preferred locale for notifications and emails (en, fr)';
