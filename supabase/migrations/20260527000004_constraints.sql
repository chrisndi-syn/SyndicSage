-- ─────────────────────────────────────────────────────────────
-- SyndicSage V5 — Additional DB Constraints
--
-- Adds CHECK constraints that were missing from the foundation
-- migration to enforce data integrity at the DB level:
--   1. documents.mime_type whitelist (PDF, JPEG, PNG only)
--   2. building_members.role must be a valid enum value
--   3. invitations.token minimum length (64 hex chars)
-- ─────────────────────────────────────────────────────────────

-- 1. Restrict MIME types on documents to the application whitelist.
--    ClamAV scan + Hono MIME check enforce this at upload time,
--    but a DB constraint is the last line of defence.
ALTER TABLE documents
  ADD CONSTRAINT documents_mime_type_whitelist
  CHECK (mime_type IN ('application/pdf', 'image/jpeg', 'image/png'));

-- 2. Ensure building_members.role is always a valid role.
--    Matches the UserRole type in packages/types.
ALTER TABLE building_members
  ADD CONSTRAINT building_members_role_valid
  CHECK (role IN ('syndic', 'co_syndic', 'co_owner', 'renter'));

-- 3. Ensure invitation tokens are at least 64 characters (32 bytes hex).
--    Tokens are generated with crypto.randomBytes(32).toString('hex').
ALTER TABLE invitations
  ADD CONSTRAINT invitations_token_min_length
  CHECK (length(token) >= 64);
