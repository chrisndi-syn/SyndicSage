-- ─────────────────────────────────────────────────────────────
-- SyndicSage V5 — Phase 5: Governance
--
-- Adds columns to existing foundation tables:
-- meetings, votes, roadmap_items, vote_casts
-- No new tables — foundation already has the core schemas.
-- ─────────────────────────────────────────────────────────────

-- ── Meetings — add organization_id + Daily.co columns ─────────
ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS daily_room_name TEXT,
  ADD COLUMN IF NOT EXISTS daily_room_url  TEXT,
  ADD COLUMN IF NOT EXISTS transcript      TEXT,
  ADD COLUMN IF NOT EXISTS started_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ended_at        TIMESTAMPTZ;

-- Backfill organization_id from buildings
UPDATE meetings m
SET organization_id = b.organization_id
FROM buildings b
WHERE b.id = m.building_id
  AND m.organization_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_meetings_building ON meetings (building_id)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_meetings_org ON meetings (organization_id)
  WHERE deleted_at IS NULL;

-- ── Votes — add organization_id + timing columns ──────────────
ALTER TABLE votes
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS vote_opened_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS vote_closed_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS description     TEXT;

UPDATE votes v
SET organization_id = b.organization_id
FROM buildings b
WHERE b.id = v.building_id
  AND v.organization_id IS NULL;

-- ── Roadmap items — add organization_id ───────────────────────
ALTER TABLE roadmap_items
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations ON DELETE CASCADE;

UPDATE roadmap_items r
SET organization_id = b.organization_id
FROM buildings b
WHERE b.id = r.building_id
  AND r.organization_id IS NULL;

-- ── vote_casts — add organization_id ─────────────────────────
ALTER TABLE vote_casts
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations ON DELETE CASCADE;

UPDATE vc
SET organization_id = v.organization_id
FROM vote_casts vc
JOIN votes v ON v.id = vc.vote_id
WHERE vc.organization_id IS NULL;

-- ── Meeting attendees ─────────────────────────────────────────
-- Tracks who joined a Daily.co meeting room and when.
CREATE TABLE IF NOT EXISTS meeting_attendees (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id           UUID        NOT NULL REFERENCES meetings ON DELETE CASCADE,
  building_id          UUID        NOT NULL REFERENCES buildings ON DELETE CASCADE,
  organization_id      UUID        NOT NULL REFERENCES organizations ON DELETE CASCADE,
  user_id              UUID        REFERENCES auth.users ON DELETE SET NULL,
  daily_participant_id TEXT,
  joined_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at              TIMESTAMPTZ
);

ALTER TABLE meeting_attendees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meeting_attendees_staff" ON meeting_attendees
  FOR ALL USING (is_member(building_id, ARRAY['syndic','co_syndic']));

-- ── RLS on existing tables (if not already set) ───────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'meetings' AND policyname = 'meetings_members'
  ) THEN
    ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "meetings_members" ON meetings
      FOR ALL USING (is_member(building_id, ARRAY['syndic','co_syndic','co_owner','renter']));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'votes' AND policyname = 'votes_members'
  ) THEN
    ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "votes_members" ON votes
      FOR ALL USING (is_member(building_id, ARRAY['syndic','co_syndic','co_owner','renter']));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'vote_casts' AND policyname = 'vote_casts_own'
  ) THEN
    ALTER TABLE vote_casts ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "vote_casts_own" ON vote_casts
      FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'roadmap_items' AND policyname = 'roadmap_members'
  ) THEN
    ALTER TABLE roadmap_items ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "roadmap_members" ON roadmap_items
      FOR ALL USING (is_member(building_id, ARRAY['syndic','co_syndic','co_owner','renter']));
  END IF;
END $$;
