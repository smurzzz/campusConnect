-- Admin-created images (announcement covers, event covers) upload to the
-- `cms-images` bucket, mirroring the concern-attachments / lost-found pattern:
-- public read, write restricted to the owner's Clerk-id top-level folder.

INSERT INTO storage.buckets (id, name, public)
VALUES ('cms-images', 'cms-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "cms_images_read_public" ON storage.objects;
DROP POLICY IF EXISTS "cms_images_write_own" ON storage.objects;
DROP POLICY IF EXISTS "cms_images_manage_own" ON storage.objects;

CREATE POLICY "cms_images_read_public" ON storage.objects
  FOR SELECT USING (bucket_id = 'cms-images');

CREATE POLICY "cms_images_write_own" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    bucket_id = 'cms-images'
    AND (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
  );

CREATE POLICY "cms_images_manage_own" ON storage.objects
  FOR UPDATE TO anon, authenticated
  USING (
    bucket_id = 'cms-images'
    AND (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
  );
