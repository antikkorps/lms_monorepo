-- Migration: Create notifications and notification_preferences tables
-- Date: 2026-01-31

-- Enum types
DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'lesson_completed',
    'course_completed',
    'quiz_passed',
    'badge_earned',
    'discussion_reply',
    'purchase_confirmed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE digest_frequency AS ENUM ('never', 'daily', 'weekly');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  data JSONB DEFAULT '{}',
  link TEXT,
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_read
ON notifications(user_id, read);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
ON notifications(user_id, created_at DESC);

-- Notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  email_enabled JSONB DEFAULT '{"lesson_completed":true,"course_completed":true,"quiz_passed":true,"badge_earned":true,"discussion_reply":true,"purchase_confirmed":true}',
  in_app_enabled JSONB DEFAULT '{"lesson_completed":true,"course_completed":true,"quiz_passed":true,"badge_earned":true,"discussion_reply":true,"purchase_confirmed":true}',
  digest_frequency digest_frequency DEFAULT 'weekly',
  digest_day INTEGER DEFAULT 1 CHECK (digest_day >= 0 AND digest_day <= 6),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for notification preferences
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id
ON notification_preferences(user_id);

-- Index for digest job queries
CREATE INDEX IF NOT EXISTS idx_notification_preferences_digest
ON notification_preferences(digest_frequency, digest_day)
WHERE digest_frequency != 'never';
