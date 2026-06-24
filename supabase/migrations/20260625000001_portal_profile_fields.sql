-- ── Portal profile fields ─────────────────────────────────────
-- Adds language preference to user profiles table.
-- Adds resident-specific fields to building_members.

-- preferred_language on profiles (used by profile API)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS preferred_language TEXT NOT NULL DEFAULT 'fr'
  CHECK (preferred_language IN ('en','fr','nl'));

-- Resident-specific fields on building_members
ALTER TABLE building_members
  ADD COLUMN IF NOT EXISTS mailing_address TEXT,
  ADD COLUMN IF NOT EXISTS occupant_count  SMALLINT CHECK (occupant_count > 0),
  ADD COLUMN IF NOT EXISTS left_at         TIMESTAMPTZ;
