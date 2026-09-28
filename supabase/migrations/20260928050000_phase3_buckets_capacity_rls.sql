-- Phase 3 completion: storage buckets, capacity enforcement, RLS fixes.
--
-- Three gaps remain after 20260928030000/20260928040000:
--
-- 1. Storage buckets. Concern attachments and lost & found photos upload to
--    `concern-attachments` / `lost-found-attachments` from the client, but no
--    bucket existed, so every upload failed with "Bucket not found". Buckets
--    and their policies are created idempotently here.
--
-- 2. Capacity enforcement. The app-level count in `registerForEvent` races:
--    two concurrent requests can both pass the check and overbook the event.
--    Registration rows are now unique per (event, student) and an
--    authorization-free trigger rejects inserts once the event is full, so
--    the guarantee holds no matter which client bypasses the check.
--
-- 3. RLS gaps:
--    - `concerns_select_staff`/`concern_messages_insert_staff`/etc. test
--      `auth.jwt() ->> 'role' IN ('staff', 'admin')`, but the app's role
--      vocabulary is `personnel`/`admin` (`lib/constants/roles.ts`), so
--      personnel matched nothing. Replaced with a canonical helper.
--    - There was no admin SELECT policy on `concerns` or `concern_messages`
--      (the personnel fix also covers admins), and no SELECT policy at all on
--      `users` for admins, so Manage Users and assignment dropdowns rendered
--      empty for the one role that must see them.
--    - `events_insert_authenticated` allowed any signed-in user to create
--      events; tightened to admin, matching the announcements model.
--
-- Storage policies compare the object path's owner folder against the Clerk
-- id in the token (`auth.jwt() ->> 'sub'`), and clients upload to
-- `<clerk-user-id>/<filename>` to match.

-- ---------------------------------------------------------------------------
-- 1. Storage buckets
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('concern-attachments', 'concern-attachments', true),
  ('lost-found-attachments', 'lost-found-attachments', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "concern_attachments_read_public" ON storage.objects;
DROP POLICY IF EXISTS "concern_attachments_write_own" ON storage.objects;
DROP POLICY IF EXISTS "concern_attachments_manage_own" ON storage.objects;
DROP POLICY IF EXISTS "lost_found_attachments_read_public" ON storage.objects;
DROP POLICY IF EXISTS "lost_found_attachments_write_own" ON storage.objects;
DROP POLICY IF EXISTS "lost_found_attachments_manage_own" ON storage.objects;

CREATE POLICY "concern_attachments_read_public" ON storage.objects
  FOR SELECT USING (bucket_id = 'concern-attachments');

CREATE POLICY "concern_attachments_write_own" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    bucket_id = 'concern-attachments'
    AND (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
  );

CREATE POLICY "concern_attachments_manage_own" ON storage.objects
  FOR UPDATE TO anon, authenticated
  USING (
    bucket_id = 'concern-attachments'
    AND (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
  );

CREATE POLICY "lost_found_attachments_read_public" ON storage.objects
  FOR SELECT USING (bucket_id = 'lost-found-attachments');

CREATE POLICY "lost_found_attachments_write_own" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    bucket_id = 'lost-found-attachments'
    AND (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
  );

CREATE POLICY "lost_found_attachments_manage_own" ON storage.objects
  FOR UPDATE TO anon, authenticated
  USING (
    bucket_id = 'lost-found-attachments'
    AND (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
  );

-- ---------------------------------------------------------------------------
-- 2. Capacity enforcement for event registrations
-- ---------------------------------------------------------------------------

-- One registration per student per event (regardless of status).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'event_registrations_event_student_unique'
      AND conrelid = 'public.event_registrations'::regclass
  ) THEN
    ALTER TABLE public.event_registrations
      ADD CONSTRAINT event_registrations_event_student_unique
      UNIQUE (event_id, student_id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.enforce_event_capacity()
RETURNS TRIGGER AS $$
DECLARE
    capacity INTEGER;
    registered BIGINT;
BEGIN
    SELECT e.capacity INTO capacity FROM public.events e WHERE e.id = NEW.event_id;

    -- A NULL capacity means "unlimited".
    IF capacity IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT count(*) INTO registered
    FROM public.event_registrations r
    WHERE r.event_id = NEW.event_id
      AND (TG_OP = 'INSERT' OR r.id <> NEW.id);

    IF registered >= capacity THEN
        RAISE EXCEPTION 'Event is at full capacity'
            USING ERRCODE = 'check_violation',
                  HINT = 'All seats for this event have been taken.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS event_capacity_trigger ON public.event_registrations;
CREATE TRIGGER event_capacity_trigger
BEFORE INSERT ON public.event_registrations
FOR EACH ROW
EXECUTE FUNCTION public.enforce_event_capacity();

-- ---------------------------------------------------------------------------
-- 3. Canonical role check + RLS fixes
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.jwt_role()
RETURNS TEXT AS $$
    SELECT COALESCE(
        auth.jwt() ->> 'role',
        auth.jwt() -> 'metadata' ->> 'role'
    );
$$ LANGUAGE sql STABLE;

DROP POLICY IF EXISTS "concerns_select_own_student" ON public.concerns;
DROP POLICY IF EXISTS "concerns_select_staff" ON public.concerns;
DROP POLICY IF EXISTS "concerns_insert_student" ON public.concerns;
DROP POLICY IF EXISTS "concerns_update_student" ON public.concerns;
DROP POLICY IF EXISTS "concerns_update_staff" ON public.concerns;
DROP POLICY IF EXISTS "concerns_delete_admin" ON public.concerns;
DROP POLICY IF EXISTS "concern_messages_select_related" ON public.concern_messages;
DROP POLICY IF EXISTS "concern_messages_insert_student" ON public.concern_messages;
DROP POLICY IF EXISTS "concern_messages_insert_staff" ON public.concern_messages;
DROP POLICY IF EXISTS "lost_found_items_update_staff" ON public.lost_found_items;
DROP POLICY IF EXISTS "lost_found_items_insert_student" ON public.lost_found_items;
DROP POLICY IF EXISTS "events_insert_authenticated" ON public.events;
DROP POLICY IF EXISTS "users_select_admin" ON public.users;

-- Concerns: students see their own, personnel and admins see everything.
CREATE POLICY "concerns_select_own_student" ON public.concerns
  FOR SELECT USING (
    public.jwt_role() = 'student' AND student_id = (auth.jwt() ->> 'sub')
  );

CREATE POLICY "concerns_select_staff" ON public.concerns
  FOR SELECT USING (public.jwt_role() IN ('personnel', 'admin', 'staff'));

CREATE POLICY "concerns_insert_student" ON public.concerns
  FOR INSERT WITH CHECK (
    public.jwt_role() = 'student' AND student_id = (auth.jwt() ->> 'sub')
  );

CREATE POLICY "concerns_update_student" ON public.concerns
  FOR UPDATE USING (
    student_id = (auth.jwt() ->> 'sub') AND public.jwt_role() = 'student'
  )
  WITH CHECK (
    student_id = (auth.jwt() ->> 'sub') AND public.jwt_role() = 'student'
  );

CREATE POLICY "concerns_update_staff" ON public.concerns
  FOR UPDATE USING (public.jwt_role() IN ('personnel', 'admin', 'staff'))
  WITH CHECK (public.jwt_role() IN ('personnel', 'admin', 'staff'));

CREATE POLICY "concerns_delete_admin" ON public.concerns
  FOR DELETE USING (public.jwt_role() = 'admin');

-- Concern messages: visible inside concerns you own or staff over, and
-- participants may reply.
CREATE POLICY "concern_messages_select_related" ON public.concern_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.concerns c
      WHERE c.id = concern_id AND (
        (public.jwt_role() = 'student' AND c.student_id = (auth.jwt() ->> 'sub')) OR
        (public.jwt_role() IN ('personnel', 'admin', 'staff'))
      )
    )
  );

CREATE POLICY "concern_messages_insert_student" ON public.concern_messages
  FOR INSERT WITH CHECK (
    public.jwt_role() = 'student' AND
    EXISTS (
      SELECT 1 FROM public.concerns c
      WHERE c.id = concern_id AND c.student_id = (auth.jwt() ->> 'sub')
    )
  );

CREATE POLICY "concern_messages_insert_staff" ON public.concern_messages
  FOR INSERT WITH CHECK (
    public.jwt_role() IN ('personnel', 'admin', 'staff') AND
    EXISTS (SELECT 1 FROM public.concerns c WHERE c.id = concern_id)
  );

-- Lost & found: same vocabulary fix.
CREATE POLICY "lost_found_items_insert_student" ON public.lost_found_items
  FOR INSERT WITH CHECK (
    public.jwt_role() IN ('student', 'personnel', 'admin', 'staff') AND
    reported_by = (auth.jwt() ->> 'sub')
  );

CREATE POLICY "lost_found_items_update_staff" ON public.lost_found_items
  FOR UPDATE USING (public.jwt_role() IN ('personnel', 'admin', 'staff'))
  WITH CHECK (public.jwt_role() IN ('personnel', 'admin', 'staff'));

-- Events: creating an event is an admin action, matching announcements.
CREATE POLICY "events_insert_authenticated" ON public.events
  FOR INSERT WITH CHECK (
    public.jwt_role() IN ('admin', 'staff') AND
    (created_by IS NULL OR created_by = (auth.jwt() ->> 'sub'))
  );

-- Admins must be able to list accounts for Manage Users and assignment
-- dropdowns; everyone else keeps their own row (`users_select_own`).
CREATE POLICY "users_select_admin" ON public.users
  FOR SELECT USING (public.jwt_role() = 'admin');
