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
CREATE TYPE isolation_strategy AS ENUM ('SHARED', 'ISOLATED');
CREATE TYPE course_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE lesson_type AS ENUM ('video', 'quiz', 'document', 'assignment');
CREATE TYPE quiz_question_type AS ENUM ('single_choice', 'multiple_choice', 'true_false');
CREATE TYPE purchase_status AS ENUM ('pending', 'completed', 'refunded', 'failed');
CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'expired', 'revoked');

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'LMS Database initialized successfully with pgvector extension';
END $$;
