-- Add missing student learning profile fields used by the teacher profile editor.
-- Run this after 0001_heart_of_english_foundation.sql has already been applied.

alter table public.student_profiles
  add column if not exists pronunciation_focus text,
  add column if not exists vocabulary_focus text,
  add column if not exists practice_target text;
