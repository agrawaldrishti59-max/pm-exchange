-- Run this ADDITIVE migration in Supabase SQL Editor before deploying the code.
-- Do NOT run schema.sql on a live database: that file drops tables.
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS interests text[] NOT NULL DEFAULT ARRAY[]::text[];
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;
-- Preserve existing approved users who already completed the previous onboarding.
UPDATE public.members
SET onboarding_completed_at = COALESCE(onboarding_completed_at, created_at, NOW()),
    interests = CASE WHEN COALESCE(array_length(interests, 1), 0) = 0 AND goal IS NOT NULL
      THEN ARRAY[CASE goal WHEN 'ideation' THEN 'case_studies' WHEN 'looking_around' THEN 'explore' ELSE goal END]::text[]
      ELSE interests END
WHERE status = 'approved' AND linkedin_url IS NOT NULL AND goal IS NOT NULL;
-- Incomplete approved members should not remain approved.
UPDATE public.members SET status = 'pending', credits = 0
WHERE status = 'approved' AND onboarding_completed_at IS NULL;
