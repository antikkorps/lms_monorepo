-- Migration: 011_add_video_thumbnail_url
-- Add video thumbnail URL column to lesson_contents

ALTER TABLE lesson_contents
  ADD COLUMN IF NOT EXISTS video_thumbnail_url TEXT;
