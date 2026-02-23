BEGIN;

-- ============================================================================
-- Course Prerequisites (many-to-many self-referencing on courses)
-- ============================================================================
CREATE TABLE IF NOT EXISTS course_prerequisites (
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  prerequisite_course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (course_id, prerequisite_course_id),
  CONSTRAINT no_self_prerequisite CHECK (course_id != prerequisite_course_id)
);

CREATE INDEX IF NOT EXISTS idx_course_prerequisites_course_id ON course_prerequisites (course_id);
CREATE INDEX IF NOT EXISTS idx_course_prerequisites_prerequisite_id ON course_prerequisites (prerequisite_course_id);

-- ============================================================================
-- Course Paths (ordered sequences of courses)
-- ============================================================================
DO $$ BEGIN
  CREATE TYPE course_path_status AS ENUM ('draft', 'published', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS course_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  thumbnail_url TEXT,
  status course_path_status NOT NULL DEFAULT 'draft',
  created_by_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  courses_count INTEGER NOT NULL DEFAULT 0,
  estimated_duration INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_course_paths_slug ON course_paths (slug);
CREATE INDEX IF NOT EXISTS idx_course_paths_status ON course_paths (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_course_paths_created_by ON course_paths (created_by_id);

-- Updated at trigger
DROP TRIGGER IF EXISTS update_course_paths_updated_at ON course_paths;
CREATE TRIGGER update_course_paths_updated_at
  BEFORE UPDATE ON course_paths
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Course Path Items (ordered courses within a path)
-- ============================================================================
CREATE TABLE IF NOT EXISTS course_path_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id UUID NOT NULL REFERENCES course_paths(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_path_course UNIQUE (path_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_course_path_items_path_id ON course_path_items (path_id);
CREATE INDEX IF NOT EXISTS idx_course_path_items_course_id ON course_path_items (course_id);

COMMIT;
