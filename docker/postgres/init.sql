-- =============================================================================
-- PostgreSQL Initialization Script
-- =============================================================================

-- Enable pgvector extension for AI/embedding features (V2)
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE user_role AS ENUM ('super_admin', 'tenant_admin', 'manager', 'instructor', 'learner');
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'pending');
CREATE TYPE tenant_status AS ENUM ('active', 'trial', 'suspended', 'cancelled');
CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'cancelled', 'trialing');
CREATE TYPE isolation_strategy AS ENUM ('SHARED', 'ISOLATED', 'DEDICATED');
CREATE TYPE course_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE course_category AS ENUM ('development', 'design', 'business', 'marketing', 'data_science', 'language', 'personal_development', 'other');
CREATE TYPE course_level AS ENUM ('beginner', 'intermediate', 'advanced', 'all_levels');
CREATE TYPE lesson_type AS ENUM ('video', 'quiz', 'document', 'assignment');
CREATE TYPE quiz_question_type AS ENUM ('single_choice', 'multiple_choice', 'true_false');
CREATE TYPE purchase_status AS ENUM ('pending', 'completed', 'refunded', 'failed', 'expired');
CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'expired', 'revoked');
CREATE TYPE report_reason AS ENUM ('spam', 'inappropriate', 'harassment', 'off_topic', 'other');
CREATE TYPE report_status AS ENUM ('pending', 'reviewed', 'dismissed');
CREATE TYPE discussion_visibility AS ENUM ('tenant_only', 'public_pool');
CREATE TYPE supported_locale AS ENUM ('en', 'fr');
CREATE TYPE notification_type AS ENUM ('lesson_completed', 'course_completed', 'quiz_passed', 'badge_earned', 'discussion_reply', 'purchase_confirmed', 'review_approved', 'streak_milestone', 'license_expiring_soon', 'license_expired');
CREATE TYPE review_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE refund_request_status AS ENUM ('none', 'pending', 'approved', 'rejected', 'auto_approved');
CREATE TYPE transcoding_status AS ENUM ('pending', 'processing', 'ready', 'error');
CREATE TYPE leaderboard_metric AS ENUM ('courses_completed', 'avg_quiz_score', 'current_streak', 'total_learning_time');
CREATE TYPE leaderboard_period AS ENUM ('weekly', 'monthly', 'all_time');
CREATE TYPE digest_frequency AS ENUM ('never', 'daily', 'weekly');
CREATE TYPE license_type AS ENUM ('unlimited', 'seats');

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'LMS Database initialized successfully with pgvector extension';
END $$;
