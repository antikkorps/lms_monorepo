-- Migration 013: Schema catch-up
-- Adds all missing enums, tables, and columns to align with current models.
-- Safe to run multiple times (all operations are idempotent).

-- =============================================================================
-- MISSING ENUMS
-- =============================================================================
DO $$ BEGIN CREATE TYPE course_category AS ENUM ('development', 'design', 'business', 'marketing', 'data_science', 'language', 'personal_development', 'other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE course_level AS ENUM ('beginner', 'intermediate', 'advanced', 'all_levels'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE review_status AS ENUM ('pending', 'approved', 'rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE notification_type AS ENUM ('lesson_completed', 'course_completed', 'quiz_passed', 'badge_earned', 'discussion_reply', 'purchase_confirmed', 'review_approved', 'streak_milestone', 'license_expiring_soon', 'license_expired'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE refund_request_status AS ENUM ('none', 'pending', 'approved', 'rejected', 'auto_approved'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE transcoding_status AS ENUM ('pending', 'processing', 'ready', 'error'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE leaderboard_metric AS ENUM ('courses_completed', 'avg_quiz_score', 'current_streak', 'total_learning_time'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE leaderboard_period AS ENUM ('weekly', 'monthly', 'all_time'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE digest_frequency AS ENUM ('never', 'daily', 'weekly'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE license_type AS ENUM ('unlimited', 'seats'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add missing values to existing enums
DO $$ BEGIN ALTER TYPE isolation_strategy ADD VALUE IF NOT EXISTS 'DEDICATED'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE purchase_status ADD VALUE IF NOT EXISTS 'expired'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================================================
-- MISSING COLUMNS ON EXISTING TABLES
-- =============================================================================

-- Users: locale
ALTER TABLE users ADD COLUMN IF NOT EXISTS locale VARCHAR(5) NOT NULL DEFAULT 'en';

-- Courses: currency, ratings, category, level, stripe
ALTER TABLE courses ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'EUR';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3, 2) NOT NULL DEFAULT 0;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS ratings_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS category course_category NOT NULL DEFAULT 'other';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS level course_level NOT NULL DEFAULT 'all_levels';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS stripe_product_id VARCHAR(255);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category);
CREATE INDEX IF NOT EXISTS idx_courses_level ON courses(level);

-- Purchases: refund fields
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS stripe_refund_id VARCHAR(255);
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS refund_reason VARCHAR(500);
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10, 2);
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS is_partial_refund BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS refund_request_status refund_request_status NOT NULL DEFAULT 'none';
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS refund_requested_at TIMESTAMPTZ;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS refund_request_reason TEXT;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS refund_reviewed_by UUID REFERENCES users(id);
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS refund_reviewed_at TIMESTAMPTZ;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS refund_rejection_reason TEXT;

-- Badges: category, rarity
ALTER TABLE badges ADD COLUMN IF NOT EXISTS category VARCHAR(20) NOT NULL DEFAULT 'milestone';
ALTER TABLE badges ADD COLUMN IF NOT EXISTS rarity VARCHAR(20) NOT NULL DEFAULT 'common';

-- =============================================================================
-- MISSING TABLES
-- =============================================================================

-- Lesson Contents
CREATE TABLE IF NOT EXISTS lesson_contents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    lang supported_locale NOT NULL,
    title VARCHAR(255),
    video_url TEXT,
    video_id VARCHAR(255),
    transcript TEXT,
    description TEXT,
    transcoding_status transcoding_status,
    video_source_key TEXT,
    video_playback_url TEXT,
    video_stream_id VARCHAR(255),
    transcoding_error TEXT,
    video_thumbnail_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(lesson_id, lang)
);
CREATE INDEX IF NOT EXISTS idx_lesson_contents_lesson_id ON lesson_contents(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_contents_lang ON lesson_contents(lang);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    data JSONB NOT NULL DEFAULT '{}',
    link TEXT,
    read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at);

-- Notification Preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    email_enabled JSONB NOT NULL DEFAULT '{}',
    in_app_enabled JSONB NOT NULL DEFAULT '{}',
    digest_frequency digest_frequency NOT NULL DEFAULT 'weekly',
    digest_day INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_digest ON notification_preferences(digest_frequency, digest_day);

-- Course Reviews
CREATE TABLE IF NOT EXISTS course_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    comment TEXT,
    status review_status NOT NULL DEFAULT 'pending',
    moderated_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    moderated_at TIMESTAMPTZ,
    moderation_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Email Logs
CREATE TABLE IF NOT EXISTS email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL,
    recipient VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'sent',
    provider VARCHAR(50) NOT NULL,
    message_id VARCHAR(255),
    error TEXT,
    metadata JSONB NOT NULL DEFAULT '{}',
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_email_logs_type ON email_logs(type);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at);

-- User Activity Log
CREATE TABLE IF NOT EXISTS user_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL,
    activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reference_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, activity_type, activity_date, reference_id)
);

-- User Streaks
CREATE TABLE IF NOT EXISTS user_streaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    last_active_date DATE,
    streak_updated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Leaderboard Entries
CREATE TABLE IF NOT EXISTS leaderboard_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    metric leaderboard_metric NOT NULL,
    period leaderboard_period NOT NULL,
    score DECIMAL(12, 2) NOT NULL DEFAULT 0,
    rank INTEGER NOT NULL DEFAULT 0,
    period_start DATE NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_metric_period ON leaderboard_entries(metric, period, period_start, rank);
CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_user_id ON leaderboard_entries(user_id);

-- Tenant Course Licenses
CREATE TABLE IF NOT EXISTS tenant_course_licenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    course_id UUID NOT NULL REFERENCES courses(id),
    purchased_by_id UUID NOT NULL REFERENCES users(id),
    license_type license_type NOT NULL,
    seats_total INTEGER,
    seats_used INTEGER NOT NULL DEFAULT 0,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    status purchase_status NOT NULL DEFAULT 'pending',
    stripe_payment_intent_id VARCHAR(255),
    stripe_checkout_session_id VARCHAR(255),
    stripe_invoice_id VARCHAR(255),
    purchased_at TIMESTAMPTZ,
    stripe_refund_id VARCHAR(255),
    refunded_at TIMESTAMPTZ,
    refund_reason VARCHAR(500),
    refund_amount DECIMAL(10, 2),
    is_partial_refund BOOLEAN NOT NULL DEFAULT false,
    expires_at TIMESTAMPTZ,
    renewed_at TIMESTAMPTZ,
    renewal_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tenant_course_licenses_tenant ON tenant_course_licenses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_course_licenses_course ON tenant_course_licenses(course_id);
CREATE INDEX IF NOT EXISTS idx_tenant_course_licenses_tenant_course ON tenant_course_licenses(tenant_id, course_id);

-- Tenant Course License Assignments
CREATE TABLE IF NOT EXISTS tenant_course_license_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_id UUID NOT NULL REFERENCES tenant_course_licenses(id),
    user_id UUID NOT NULL REFERENCES users(id),
    assigned_by_id UUID NOT NULL REFERENCES users(id),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(license_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_license_assignments_license ON tenant_course_license_assignments(license_id);
CREATE INDEX IF NOT EXISTS idx_license_assignments_user ON tenant_course_license_assignments(user_id);
