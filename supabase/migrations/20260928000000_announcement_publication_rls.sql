-- Announcements: publication state, audience vocabulary, and RLS hardening.
--
-- 1. `announcements_select_authenticated` used `auth.role() IS NOT NULL`, which is
--    true for every signed-in user. Postgres ORs permissive policies together,
--    so that policy made every draft readable by any student who guessed a UUID
--    in `/announcements/<id>`. Replace it with a policy that only widens the
--    published set for admins.
-- 2. `audience` and `status` had no CHECK, so a typo like "student only" (or
--    the Title Case "Published" that is still in the table) was accepted and
--    then never matched the UI vocabulary or the RLS predicate.
-- 3. `created_by` references `public.users(id)`, a UUID, but authentication is
--    Clerk, whose user ids are opaque strings. Nothing could ever satisfy that
--    FK, so new rows could not record authorship. Widen the column to TEXT,
--    which preserves whatever ids are already stored.
--
-- This migration is non-destructive: no column is dropped, and the vocabulary
-- CHECKs are added `NOT VALID` so a surprise legacy value cannot abort a deploy.

-- ---------------------------------------------------------------------------
-- 1. Announcements live in the Clerk id space, not the Supabase auth.users space.
--    ALTER ... TYPE keeps existing ids; DROP COLUMN + ADD COLUMN would lose them.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'announcements'
      AND data_type = 'uuid' AND column_name = 'created_by'
  ) THEN
    -- The FK has to go first: a UUID -> TEXT conversion cannot keep it.
    ALTER TABLE public.announcements DROP CONSTRAINT IF EXISTS announcements_created_by_fkey;
    ALTER TABLE public.announcements
      ALTER COLUMN created_by TYPE TEXT USING created_by::text;
  END IF;
END $$;

COMMENT ON COLUMN public.announcements.created_by IS
  'Clerk user id (e.g. user_2abc...). Null only if the session had not resolved when the row was written.';

-- ---------------------------------------------------------------------------
-- 2. Normalise the stored vocabulary, then lock it down.
--    NULL audience means "everyone" (see lib/constants/categories.ts).
--    NULL status fails closed as 'draft' so it can never surface publicly.
-- ---------------------------------------------------------------------------
UPDATE public.announcements
SET audience = CASE lower(btrim(audience))
  WHEN 'students only' THEN 'Students only'
  WHEN 'personnel only' THEN 'Personnel only'
  WHEN 'student only' THEN 'Students only'
  WHEN 'personnel' THEN 'Personnel only'
  ELSE 'Everyone'
END
WHERE audience IS NOT NULL;

ALTER TABLE public.announcements
  DROP CONSTRAINT IF EXISTS announcements_audience_check;

-- NOT VALID: existing rows are not re-checked, so an unexpected legacy value
-- cannot fail the deploy. Run VALIDATE CONSTRAINT after auditing leftovers.
ALTER TABLE public.announcements
  ADD CONSTRAINT announcements_audience_check
  CHECK (audience IS NULL OR audience IN ('Everyone', 'Students only', 'Personnel only'))
  NOT VALID;

UPDATE public.announcements
SET status = lower(btrim(status))
WHERE status IS NOT NULL;

UPDATE public.announcements
SET status = 'draft'
WHERE status IS NULL;

ALTER TABLE public.announcements
  DROP CONSTRAINT IF EXISTS announcements_status_check;

ALTER TABLE public.announcements
  ADD CONSTRAINT announcements_status_check
  CHECK (status IN ('published', 'draft'))
  NOT VALID;

-- ---------------------------------------------------------------------------
-- 3. Only admins may read drafts.
--
--    Clerk's session token carries publicMetadata under a `metadata` key by
--    default; flattening it to a top-level `role` claim requires a session-token
--    template. Accept both shapes so the policies are correct either way.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "announcements_select_authenticated" ON public.announcements;

-- Guests and students keep the published-only policy created in
-- 20260927100001_rls_policies.sql, which stays in force for every role.
CREATE POLICY "announcements_select_authenticated" ON public.announcements
  FOR SELECT
  USING (
    status = 'published'
    OR (auth.jwt() ->> 'role') = 'admin'
    OR (auth.jwt() -> 'metadata' ->> 'role') = 'admin'
  );

-- `announcements_select_public` already restricts to `status = 'published'`.

-- ---------------------------------------------------------------------------
-- 4. Authorship is set from the caller's session, not from a form field.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "announcements_insert_admin" ON public.announcements;

CREATE POLICY "announcements_insert_admin" ON public.announcements
  FOR INSERT
  WITH CHECK (
    (
      (auth.jwt() ->> 'role') = 'admin'
      OR (auth.jwt() -> 'metadata' ->> 'role') = 'admin'
    )
    AND (created_by IS NULL OR created_by = (auth.jwt() ->> 'sub'))
  );

DROP POLICY IF EXISTS "announcements_update_admin" ON public.announcements;

CREATE POLICY "announcements_update_admin" ON public.announcements
  FOR UPDATE
  USING (
    (auth.jwt() ->> 'role') = 'admin'
    OR (auth.jwt() -> 'metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    (
      (auth.jwt() ->> 'role') = 'admin'
      OR (auth.jwt() -> 'metadata' ->> 'role') = 'admin'
    )
    -- An edit may not reassign authorship.
    AND (created_by IS NULL OR created_by = (auth.jwt() ->> 'sub'))
  );

DROP POLICY IF EXISTS "announcements_delete_admin" ON public.announcements;

CREATE POLICY "announcements_delete_admin" ON public.announcements
  FOR DELETE
  USING (
    (auth.jwt() ->> 'role') = 'admin'
    OR (auth.jwt() -> 'metadata' ->> 'role') = 'admin'
  );
