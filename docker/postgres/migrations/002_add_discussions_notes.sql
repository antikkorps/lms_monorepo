-- =============================================================================
-- Migration: Add Discussions and Notes System
-- Date: 2026-01-22
-- Description: Adds discussions, replies, reports, and personal notes features
-- =============================================================================

-- Check if enum types exist, create if not
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_reason') THEN
        CREATE TYPE report_reason AS ENUM ('spam', 'inappropriate', 'harassment', 'off_topic', 'other');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_status') THEN
        CREATE TYPE report_status AS ENUM ('pending', 'reviewed', 'dismissed');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'discussion_visibility') THEN
        CREATE TYPE discussion_visibility AS ENUM ('tenant_only', 'public_pool');
    END IF;
END $$;

-- =============================================================================
-- DISCUSSIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS discussions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    reply_count INTEGER NOT NULL DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    deleted_reason VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discussions_lesson_id ON discussions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_discussions_user_id ON discussions(user_id);
CREATE INDEX IF NOT EXISTS idx_discussions_tenant_id ON discussions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_discussions_is_deleted ON discussions(is_deleted);
CREATE INDEX IF NOT EXISTS idx_discussions_created_at ON discussions(created_at);

-- =============================================================================
-- DISCUSSION_REPLIES
-- =============================================================================
CREATE TABLE IF NOT EXISTS discussion_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discussion_id UUID NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    deleted_reason VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discussion_replies_discussion_id ON discussion_replies(discussion_id);
CREATE INDEX IF NOT EXISTS idx_discussion_replies_user_id ON discussion_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_discussion_replies_is_deleted ON discussion_replies(is_deleted);
CREATE INDEX IF NOT EXISTS idx_discussion_replies_created_at ON discussion_replies(created_at);

-- =============================================================================
-- DISCUSSION_REPORTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS discussion_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discussion_id UUID REFERENCES discussions(id) ON DELETE CASCADE,
    reply_id UUID REFERENCES discussion_replies(id) ON DELETE CASCADE,
    reported_by_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason report_reason NOT NULL,
    description TEXT,
    status report_status NOT NULL DEFAULT 'pending',
    reviewed_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (discussion_id IS NOT NULL OR reply_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_discussion_reports_discussion_id ON discussion_reports(discussion_id);
CREATE INDEX IF NOT EXISTS idx_discussion_reports_reply_id ON discussion_reports(reply_id);
CREATE INDEX IF NOT EXISTS idx_discussion_reports_reported_by_id ON discussion_reports(reported_by_id);
CREATE INDEX IF NOT EXISTS idx_discussion_reports_status ON discussion_reports(status);

-- =============================================================================
-- NOTES (Personal notes per user per lesson)
-- =============================================================================
CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_lesson_id ON notes(lesson_id);

-- =============================================================================
-- LOG
-- =============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Migration 002: Discussions and Notes tables created successfully';
END $$;
