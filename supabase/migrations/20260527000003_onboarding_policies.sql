-- ─────────────────────────────────────────────────────────────
-- SyndicSage V5 — Onboarding Bootstrap Policies
--
-- The foundation migration's RLS policies require existing
-- membership to write — a chicken-and-egg that blocks new users
-- from completing onboarding.
--
-- This migration adds minimal INSERT-only policies for the
-- four steps of the onboarding flow, in order:
--   1. Create organization  (user is authenticated, has no profile yet)
--   2. Create profile        (own row, covered by existing profiles_own)
--   3. Create first building (user's profile + org exist)
--   4. Add self as syndic    (only for buildings in their own org)
--
-- Security constraints:
--   • Org: only if user has no profile yet (prevents duplicate orgs)
--   • Building: only if org belongs to user's profile
--   • Member: only self, only syndic role, only for own-org buildings
-- ─────────────────────────────────────────────────────────────

-- 1. Allow a new authenticated user to create their first organization.
--    Gated by: not having a profile yet (prevents extra org creation post-onboarding).
CREATE POLICY "orgs_insert_onboarding" ON organizations
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid())
  );

-- 2. profiles_own already covers INSERT (id = auth.uid()) — no new policy needed.

-- 3. Allow inserting a building when the user's profile belongs to that organization.
CREATE POLICY "buildings_insert_own_org" ON buildings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND organization_id = buildings.organization_id
    )
  );

-- 4. Allow a user to add themselves as syndic of a building in their own org.
--    Constrained to: self only, syndic role only, own-org buildings only.
CREATE POLICY "members_insert_self_syndic" ON building_members
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    role    = 'syndic'   AND
    EXISTS (
      SELECT 1 FROM buildings b
      JOIN   profiles p ON p.organization_id = b.organization_id
      WHERE  b.id = building_members.building_id
        AND  p.id = auth.uid()
    )
  );
