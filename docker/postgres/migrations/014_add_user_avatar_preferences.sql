-- Migration 014: Add avatar style preferences to users
-- Stores DiceBear avatar style and variation per user

ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_style VARCHAR(30) DEFAULT 'initials';
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_variation SMALLINT DEFAULT 0;
