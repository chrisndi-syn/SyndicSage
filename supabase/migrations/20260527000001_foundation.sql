-- ─────────────────────────────────────────────────────────────
-- SyndicSage V5 — Foundation Migration
--
-- Architecture decisions baked in:
-- • organizations layer (billing scope, professional syndics)
-- • units table with ownership_share (Belgian VME weighted voting)
-- • soft deletes (deleted_at) on all mutable tables
-- • row-level multi-tenant isolation via building_members
-- • is_member() single security checkpoint for all RLS
-- • audit_log immutable, server-write only
-- • documents: storage_path only, never public URLs
-- ─────────────────────────────────────────────────────────────

-- ── Organizations ─────────────────────────────────────────────
-- Billing + subscription scope. Auto-created on signup.
-- Professional syndics rename to their firm. Every building belongs to one org.
CREATE TABLE organizations (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT        NOT NULL,
  vat_number        TEXT,
  plan              TEXT        NOT NULL DEFAULT 'free'
                                CHECK (plan IN ('free','starter','pro','enterprise')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

-- ── Profiles ──────────────────────────────────────────────────
CREATE TABLE profiles (
  id                UUID        PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  organization_id   UUID        NOT NULL REFERENCES organizations ON DELETE RESTRICT,
  full_name         TEXT        NOT NULL,
  email             TEXT        NOT NULL,
  avatar_url        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Buildings ─────────────────────────────────────────────────
-- No user_id. Ownership = building_members row where role = 'syndic'.
CREATE TABLE buildings (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID        NOT NULL REFERENCES organizations ON DELETE RESTRICT,
  name              TEXT        NOT NULL,
  address           TEXT        NOT NULL,
  city              TEXT        NOT NULL,
  unit_count        INTEGER     NOT NULL CHECK (unit_count > 0),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX idx_buildings_org ON buildings (organization_id) WHERE deleted_at IS NULL;

-- ── Building Members ──────────────────────────────────────────
-- Source of truth for all access. One row per user per building.
CREATE TABLE building_members (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id       UUID        NOT NULL REFERENCES buildings ON DELETE CASCADE,
  user_id           UUID        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role              TEXT        NOT NULL CHECK (role IN ('syndic','co_syndic','co_owner','renter')),
  unit_id           UUID,                                -- set for co_owner + renter (FK added after units)
  invited_by        UUID        REFERENCES auth.users,
  joined_at         TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (building_id, user_id)
);

CREATE INDEX idx_building_members_user     ON building_members (user_id);
CREATE INDEX idx_building_members_building ON building_members (building_id);

-- ── RBAC helper ───────────────────────────────────────────────
-- Every RLS policy calls this. Single security checkpoint.
CREATE OR REPLACE FUNCTION is_member(bid UUID, roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM building_members
    WHERE building_id = bid
    AND   user_id     = auth.uid()
    AND   role        = ANY(roles)
  );
$$;

-- ── Units (apartments / lots) ─────────────────────────────────
-- ownership_share (tantièmes) required for weighted VME voting (Belgian law).
CREATE TABLE units (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id       UUID        NOT NULL REFERENCES buildings ON DELETE CASCADE,
  unit_number       TEXT        NOT NULL,
  floor             INTEGER,
  unit_type         TEXT        NOT NULL DEFAULT 'apartment'
                                CHECK (unit_type IN ('apartment','parking','storage','commercial','other')),
  ownership_share   NUMERIC(10,4) NOT NULL CHECK (ownership_share > 0),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ,
  UNIQUE (building_id, unit_number)
);

CREATE INDEX idx_units_building ON units (building_id) WHERE deleted_at IS NULL;

-- Add FK from building_members to units (now that units exists)
ALTER TABLE building_members
  ADD CONSTRAINT fk_building_members_unit
  FOREIGN KEY (unit_id) REFERENCES units (id) ON DELETE SET NULL;

-- ── Owners ────────────────────────────────────────────────────
-- Contact/display record per unit. Access rights live in building_members.
CREATE TABLE owners (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id       UUID        NOT NULL REFERENCES buildings ON DELETE CASCADE,
  unit_id           UUID        NOT NULL REFERENCES units ON DELETE RESTRICT,
  member_id         UUID        REFERENCES building_members ON DELETE SET NULL,
  full_name         TEXT        NOT NULL,
  email             TEXT        NOT NULL,
  phone             TEXT,
  is_renter         BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX idx_owners_building ON owners (building_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_owners_unit     ON owners (unit_id)     WHERE deleted_at IS NULL;

-- ── Charges ───────────────────────────────────────────────────
CREATE TABLE charges (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id       UUID          NOT NULL REFERENCES buildings ON DELETE CASCADE,
  owner_id          UUID          REFERENCES owners ON DELETE SET NULL,
  title             TEXT          NOT NULL,
  amount            NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  status            TEXT          NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending','paid','overdue')),
  period            TEXT          NOT NULL
                                  CHECK (period IN ('monthly','quarterly','annual','one_time')),
  due_date          DATE          NOT NULL,
  paid_date         DATE,
  notes             TEXT,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX idx_charges_building ON charges (building_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_charges_owner    ON charges (owner_id)    WHERE deleted_at IS NULL;
CREATE INDEX idx_charges_status   ON charges (status)      WHERE deleted_at IS NULL;

-- ── Documents ─────────────────────────────────────────────────
-- storage_path = UUID filename in private Supabase Storage bucket.
-- Never store original filenames on disk. Never store public URLs.
-- virus_scanned_at set by Hono worker after ClamAV scan passes.
CREATE TABLE documents (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id       UUID        NOT NULL REFERENCES buildings ON DELETE CASCADE,
  name              TEXT        NOT NULL,
  category          TEXT        NOT NULL
                                CHECK (category IN ('minutes','budget','contract','insurance','legal','maintenance','other')),
  visibility        TEXT        NOT NULL DEFAULT 'syndic_only'
                                CHECK (visibility IN ('syndic_only','all_residents')),
  storage_path      TEXT        NOT NULL,   -- UUID key in private bucket
  file_size         INTEGER,
  mime_type         TEXT,
  checksum          TEXT,                   -- SHA-256 for integrity verification
  uploaded_by       UUID        NOT NULL REFERENCES auth.users,
  virus_scanned_at  TIMESTAMPTZ,            -- NULL = pending scan, NOT NULL = clean
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX idx_documents_building ON documents (building_id) WHERE deleted_at IS NULL;

-- ── Notifications ─────────────────────────────────────────────
CREATE TABLE notifications (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  building_id       UUID        REFERENCES buildings ON DELETE CASCADE,
  type              TEXT        NOT NULL
                                CHECK (type IN (
                                  'charge_overdue','charge_paid','new_document',
                                  'maintenance_request','vote_opened','vote_closed',
                                  'meeting_scheduled','general'
                                )),
  title             TEXT        NOT NULL,
  body              TEXT        NOT NULL,
  read              BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications (user_id, read);

-- ── Audit Log ─────────────────────────────────────────────────
-- Immutable — NO update or delete ever. Written by Hono API only (service role key).
CREATE TABLE audit_log (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id          UUID        NOT NULL REFERENCES auth.users,
  action            TEXT        NOT NULL CHECK (action IN (
                                  'login','logout',
                                  'document_download','document_upload','document_delete',
                                  'charge_create','charge_edit','charge_delete','charge_mark_paid',
                                  'owner_add','owner_remove',
                                  'permission_change','data_export',
                                  'building_create','building_delete',
                                  'invitation_sent',
                                  'unit_create','unit_delete',
                                  'org_update'
                                )),
  resource_type     TEXT        NOT NULL,
  resource_id       UUID,
  building_id       UUID        REFERENCES buildings ON DELETE SET NULL,
  organization_id   UUID        REFERENCES organizations ON DELETE SET NULL,
  ip_hash           TEXT,       -- hashed IP, never raw
  metadata          JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_building ON audit_log (building_id,      created_at DESC);
CREATE INDEX idx_audit_log_actor    ON audit_log (actor_id,         created_at DESC);
CREATE INDEX idx_audit_log_org      ON audit_log (organization_id,  created_at DESC);

-- ── Invitations ───────────────────────────────────────────────
CREATE TABLE invitations (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id       UUID        NOT NULL REFERENCES buildings ON DELETE CASCADE,
  invited_by        UUID        NOT NULL REFERENCES auth.users,
  email             TEXT        NOT NULL,
  role              TEXT        NOT NULL CHECK (role IN ('co_syndic','co_owner','renter')),
  unit_id           UUID        REFERENCES units ON DELETE SET NULL,
  token             TEXT        NOT NULL UNIQUE,            -- generated by Hono: crypto.randomBytes(32).toString('hex')
  status            TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending','accepted','expired')),
  expires_at        TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  accepted_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

-- ── Maintenance Requests ──────────────────────────────────────
CREATE TABLE maintenance_requests (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id       UUID        NOT NULL REFERENCES buildings ON DELETE CASCADE,
  unit_id           UUID        NOT NULL REFERENCES units ON DELETE RESTRICT,
  submitted_by      UUID        NOT NULL REFERENCES auth.users,
  owner_id          UUID        REFERENCES owners ON DELETE SET NULL,
  title             TEXT        NOT NULL,
  description       TEXT        NOT NULL,
  status            TEXT        NOT NULL DEFAULT 'open'
                                CHECK (status IN ('open','in_progress','resolved','closed')),
  priority          TEXT        NOT NULL DEFAULT 'medium'
                                CHECK (priority IN ('low','medium','high','urgent')),
  image_urls        TEXT[],
  resolved_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX idx_maint_building ON maintenance_requests (building_id) WHERE deleted_at IS NULL;

-- ── Meetings ──────────────────────────────────────────────────
CREATE TABLE meetings (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id       UUID        NOT NULL REFERENCES buildings ON DELETE CASCADE,
  title             TEXT        NOT NULL,
  date              TIMESTAMPTZ NOT NULL,
  status            TEXT        NOT NULL DEFAULT 'scheduled'
                                CHECK (status IN ('scheduled','in_progress','completed')),
  agenda            TEXT,
  minutes           TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

-- ── Votes ─────────────────────────────────────────────────────
CREATE TABLE votes (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id        UUID        NOT NULL REFERENCES meetings ON DELETE CASCADE,
  building_id       UUID        NOT NULL REFERENCES buildings ON DELETE CASCADE,
  question          TEXT        NOT NULL,
  status            TEXT        NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- vote_weight snapshots unit.ownership_share at time of cast (required by Belgian law)
CREATE TABLE vote_casts (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  vote_id           UUID        NOT NULL REFERENCES votes ON DELETE CASCADE,
  user_id           UUID        NOT NULL REFERENCES auth.users,
  unit_id           UUID        NOT NULL REFERENCES units,
  choice            TEXT        NOT NULL CHECK (choice IN ('yes','no','abstain')),
  vote_weight       NUMERIC(10,4) NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (vote_id, unit_id)     -- one vote per unit, not per person
);

-- ── Roadmap Items ─────────────────────────────────────────────
CREATE TABLE roadmap_items (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id       UUID          NOT NULL REFERENCES buildings ON DELETE CASCADE,
  title             TEXT          NOT NULL,
  description       TEXT,
  status            TEXT          NOT NULL DEFAULT 'planned'
                                  CHECK (status IN ('planned','in_progress','done')),
  priority          TEXT          NOT NULL DEFAULT 'medium'
                                  CHECK (priority IN ('low','medium','high')),
  estimated_cost    NUMERIC(10,2),
  target_date       DATE,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

-- ── Payment Records ───────────────────────────────────────────
CREATE TABLE payment_records (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  charge_id         UUID          NOT NULL REFERENCES charges ON DELETE RESTRICT,
  building_id       UUID          NOT NULL REFERENCES buildings ON DELETE RESTRICT,
  owner_id          UUID          NOT NULL REFERENCES owners ON DELETE RESTRICT,
  amount            NUMERIC(10,2) NOT NULL,
  method            TEXT          NOT NULL
                                  CHECK (method IN ('bank_transfer','direct_debit','cash','online')),
  reference         TEXT,
  paid_at           TIMESTAMPTZ   NOT NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- Soft delete filter: all SELECT policies exclude deleted_at IS NOT NULL
-- ─────────────────────────────────────────────────────────────

ALTER TABLE organizations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE buildings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE building_members    ENABLE ROW LEVEL SECURITY;
ALTER TABLE units               ENABLE ROW LEVEL SECURITY;
ALTER TABLE owners              ENABLE ROW LEVEL SECURITY;
ALTER TABLE charges             ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents           ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log           ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings            ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE vote_casts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmap_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_records     ENABLE ROW LEVEL SECURITY;

-- organizations: members of any building in this org can read it; only syndic admin writes
CREATE POLICY "orgs_select" ON organizations FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND organization_id = organizations.id
  )
);
CREATE POLICY "orgs_write" ON organizations FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN building_members bm ON bm.user_id = p.id
    WHERE p.id = auth.uid() AND p.organization_id = organizations.id AND bm.role = 'syndic'
  )
);

-- profiles: own row only
CREATE POLICY "profiles_own" ON profiles FOR ALL USING (id = auth.uid());

-- buildings: any member reads; syndic writes; soft delete filter
CREATE POLICY "buildings_select" ON buildings FOR SELECT USING (
  deleted_at IS NULL AND
  EXISTS (SELECT 1 FROM building_members WHERE building_id = id AND user_id = auth.uid())
);
CREATE POLICY "buildings_write" ON buildings FOR ALL USING (
  is_member(id, ARRAY['syndic'])
);

-- building_members: syndic manages all; others read their own row
CREATE POLICY "members_select" ON building_members FOR SELECT USING (
  user_id = auth.uid() OR is_member(building_id, ARRAY['syndic','co_syndic'])
);
CREATE POLICY "members_write" ON building_members FOR ALL USING (
  is_member(building_id, ARRAY['syndic'])
);

-- units: all members read; syndic+co_syndic write; soft delete filter
CREATE POLICY "units_select" ON units FOR SELECT USING (
  deleted_at IS NULL AND is_member(building_id, ARRAY['syndic','co_syndic','co_owner','renter'])
);
CREATE POLICY "units_write" ON units FOR ALL USING (
  is_member(building_id, ARRAY['syndic','co_syndic'])
);

-- owners: staff full access; residents see their own unit only
CREATE POLICY "owners_staff" ON owners FOR ALL USING (
  deleted_at IS NULL AND is_member(building_id, ARRAY['syndic','co_syndic'])
);
CREATE POLICY "owners_self" ON owners FOR SELECT USING (
  deleted_at IS NULL AND
  member_id IN (SELECT id FROM building_members WHERE user_id = auth.uid())
);

-- charges: staff full access; residents see own unit's charges only
CREATE POLICY "charges_staff" ON charges FOR ALL USING (
  deleted_at IS NULL AND is_member(building_id, ARRAY['syndic','co_syndic'])
);
CREATE POLICY "charges_resident" ON charges FOR SELECT USING (
  deleted_at IS NULL AND
  owner_id IN (
    SELECT o.id FROM owners o
    JOIN building_members bm ON bm.id = o.member_id
    WHERE bm.user_id = auth.uid() AND o.deleted_at IS NULL
  )
);

-- documents: staff full access; residents see all_residents docs only
-- Documents with virus_scanned_at IS NULL are not visible to anyone (pending scan)
CREATE POLICY "documents_staff" ON documents FOR ALL USING (
  deleted_at IS NULL AND virus_scanned_at IS NOT NULL AND
  is_member(building_id, ARRAY['syndic','co_syndic'])
);
CREATE POLICY "documents_resident" ON documents FOR SELECT USING (
  deleted_at IS NULL AND virus_scanned_at IS NOT NULL AND
  visibility = 'all_residents' AND
  is_member(building_id, ARRAY['co_owner','renter'])
);

-- notifications: own only
CREATE POLICY "notifications_own" ON notifications FOR ALL USING (user_id = auth.uid());

-- audit_log: syndic+co_syndic read their buildings; NO client insert (service role only)
CREATE POLICY "audit_select" ON audit_log FOR SELECT USING (
  is_member(building_id, ARRAY['syndic','co_syndic'])
);

-- invitations: syndic manages all; co_syndic inserts non-syndic invites only
CREATE POLICY "invitations_syndic" ON invitations FOR ALL USING (
  deleted_at IS NULL AND is_member(building_id, ARRAY['syndic'])
);
CREATE POLICY "invitations_cosyndic_insert" ON invitations FOR INSERT WITH CHECK (
  is_member(building_id, ARRAY['co_syndic']) AND role IN ('co_owner','renter')
);

-- maintenance_requests: staff full access; residents CRUD their own
CREATE POLICY "maint_staff" ON maintenance_requests FOR ALL USING (
  deleted_at IS NULL AND is_member(building_id, ARRAY['syndic','co_syndic'])
);
CREATE POLICY "maint_own" ON maintenance_requests FOR ALL USING (
  deleted_at IS NULL AND submitted_by = auth.uid()
);

-- meetings: staff full access; co_owners read only
CREATE POLICY "meetings_staff" ON meetings FOR ALL USING (
  deleted_at IS NULL AND is_member(building_id, ARRAY['syndic','co_syndic'])
);
CREATE POLICY "meetings_resident" ON meetings FOR SELECT USING (
  deleted_at IS NULL AND is_member(building_id, ARRAY['co_owner'])
);

-- votes: staff manage; co_owners read + cast
CREATE POLICY "votes_staff" ON votes FOR ALL USING (
  is_member(building_id, ARRAY['syndic','co_syndic'])
);
CREATE POLICY "votes_resident_read" ON votes FOR SELECT USING (
  is_member(building_id, ARRAY['co_owner'])
);
CREATE POLICY "vote_casts_own" ON vote_casts FOR ALL USING (user_id = auth.uid());
CREATE POLICY "vote_casts_staff_read" ON vote_casts FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM votes v WHERE v.id = vote_id
    AND is_member(v.building_id, ARRAY['syndic','co_syndic'])
  )
);

-- roadmap: staff full access; co_owners read only
CREATE POLICY "roadmap_staff" ON roadmap_items FOR ALL USING (
  deleted_at IS NULL AND is_member(building_id, ARRAY['syndic','co_syndic'])
);
CREATE POLICY "roadmap_resident" ON roadmap_items FOR SELECT USING (
  deleted_at IS NULL AND is_member(building_id, ARRAY['co_owner'])
);

-- payment_records: staff full access; residents see their own
CREATE POLICY "payments_staff" ON payment_records FOR ALL USING (
  is_member(building_id, ARRAY['syndic','co_syndic'])
);
CREATE POLICY "payments_own" ON payment_records FOR SELECT USING (
  owner_id IN (
    SELECT o.id FROM owners o
    JOIN building_members bm ON bm.id = o.member_id
    WHERE bm.user_id = auth.uid() AND o.deleted_at IS NULL
  )
);

-- ── Triggers ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER buildings_updated_at
  BEFORE UPDATE ON buildings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER maint_updated_at
  BEFORE UPDATE ON maintenance_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at();
