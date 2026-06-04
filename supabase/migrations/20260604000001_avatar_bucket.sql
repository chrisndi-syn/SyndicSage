-- ── Avatar storage bucket ─────────────────────────────────────
-- Public bucket: avatars are shown directly in the UI without signed URLs.
-- Each user can only write to their own folder ({userId}/avatar.*).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152,  -- 2 MB
  ARRAY['image/jpeg','image/jpg','image/png','image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- RLS: authenticated users can upload/update/delete only their own avatar
CREATE POLICY "avatar_upload_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatar_update_own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatar_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Public read — anyone can view avatars (needed for public URLs)
CREATE POLICY "avatar_public_read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');
