-- Migration 008: Add transcoding fields to lesson_contents
-- Supports video transcoding pipeline via Cloudflare Stream

-- Create enum type for transcoding status
DO $$ BEGIN
  CREATE TYPE transcoding_status AS ENUM ('pending', 'processing', 'ready', 'error');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add transcoding columns to lesson_contents
ALTER TABLE lesson_contents
  ADD COLUMN IF NOT EXISTS transcoding_status transcoding_status DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS video_source_key TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS video_playback_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS video_stream_id VARCHAR(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS transcoding_error TEXT DEFAULT NULL;

-- Partial index for active transcoding jobs (pending or processing)
CREATE INDEX IF NOT EXISTS idx_lesson_contents_transcoding_active
  ON lesson_contents (transcoding_status)
  WHERE transcoding_status IN ('pending', 'processing');
