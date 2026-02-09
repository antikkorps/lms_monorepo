-- Migration 010: Search Features
-- Full-text search with tsvector, pg_trgm for fuzzy matching, course category/level

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Create enums
DO $$ BEGIN
  CREATE TYPE course_category AS ENUM (
    'development', 'design', 'business', 'marketing',
    'data_science', 'language', 'personal_development', 'other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE course_level AS ENUM (
    'beginner', 'intermediate', 'advanced', 'all_levels'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add columns to courses
ALTER TABLE courses ADD COLUMN IF NOT EXISTS category course_category DEFAULT 'other';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS level course_level DEFAULT 'all_levels';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- GIN index on search_vector for full-text search
CREATE INDEX IF NOT EXISTS idx_courses_search_vector ON courses USING GIN (search_vector);

-- Trigram GIN indexes for fuzzy matching on title
CREATE INDEX IF NOT EXISTS idx_courses_title_trgm ON courses USING GIN (title gin_trgm_ops);

-- Standard indexes on category, level, average_rating
CREATE INDEX IF NOT EXISTS idx_courses_category ON courses (category);
CREATE INDEX IF NOT EXISTS idx_courses_level ON courses (level);
CREATE INDEX IF NOT EXISTS idx_courses_average_rating ON courses (average_rating DESC);

-- Trigger function to update search_vector on insert/update
CREATE OR REPLACE FUNCTION update_course_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS trg_course_search_vector ON courses;
CREATE TRIGGER trg_course_search_vector
  BEFORE INSERT OR UPDATE OF title, description ON courses
  FOR EACH ROW
  EXECUTE FUNCTION update_course_search_vector();

-- Backfill existing courses
UPDATE courses
SET search_vector =
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'B')
WHERE search_vector IS NULL;
