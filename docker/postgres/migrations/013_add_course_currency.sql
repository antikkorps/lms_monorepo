-- Migration: Add currency column to courses table

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'EUR';
