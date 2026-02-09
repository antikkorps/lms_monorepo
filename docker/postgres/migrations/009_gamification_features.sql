-- Migration 009: Gamification Features (Reviews, Streaks, Leaderboards)

BEGIN;

-- =============================================================================
-- Enum Types
-- =============================================================================

CREATE TYPE review_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE leaderboard_metric AS ENUM ('courses_completed', 'avg_quiz_score', 'current_streak', 'total_learning_time');
CREATE TYPE leaderboard_period AS ENUM ('weekly', 'monthly', 'all_time');

-- =============================================================================
-- Course Reviews
-- =============================================================================

CREATE TABLE course_reviews (
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

-- One review per user per course (soft delete aware)
CREATE UNIQUE INDEX idx_course_reviews_user_course
  ON course_reviews (course_id, user_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_course_reviews_course_status ON course_reviews (course_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_course_reviews_user ON course_reviews (user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_course_reviews_status ON course_reviews (status) WHERE deleted_at IS NULL;

-- Add rating columns to courses
ALTER TABLE courses ADD COLUMN average_rating DECIMAL(3,2) DEFAULT 0;
ALTER TABLE courses ADD COLUMN ratings_count INTEGER DEFAULT 0;

-- =============================================================================
-- User Streaks
-- =============================================================================

CREATE TABLE user_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_active_date DATE,
  streak_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- User Activity Log
-- =============================================================================

CREATE TABLE user_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL,
  activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Idempotent: one entry per user/type/date/reference
CREATE UNIQUE INDEX idx_user_activity_unique
  ON user_activity_log (user_id, activity_type, activity_date, reference_id);

CREATE INDEX idx_user_activity_user_date ON user_activity_log (user_id, activity_date DESC);

-- =============================================================================
-- Leaderboard Entries
-- =============================================================================

CREATE TABLE leaderboard_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  metric leaderboard_metric NOT NULL,
  period leaderboard_period NOT NULL,
  score DECIMAL(12,2) NOT NULL DEFAULT 0,
  rank INTEGER NOT NULL DEFAULT 0,
  period_start DATE NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_leaderboard_unique
  ON leaderboard_entries (user_id, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'), COALESCE(course_id, '00000000-0000-0000-0000-000000000000'), metric, period, period_start);

CREATE INDEX idx_leaderboard_query ON leaderboard_entries (metric, period, period_start, rank);
CREATE INDEX idx_leaderboard_user ON leaderboard_entries (user_id);

-- =============================================================================
-- Triggers for updated_at (Sequelize handles updatedAt in the app layer,
-- but we add DB-level triggers as a safety net)
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_course_reviews_updated_at
  BEFORE UPDATE ON course_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_streaks_updated_at
  BEFORE UPDATE ON user_streaks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;
