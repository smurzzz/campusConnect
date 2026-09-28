-- Migrate user identity from Supabase auth UUIDs to Clerk user ids.
--
-- `public.users.id` was `UUID REFERENCES auth.users(id)`, but authentication is
-- handled by Clerk, whose ids are opaque strings like `user_2abc...`. Clerk ids
-- do not exist in `auth.users`, so the Clerk webhook could never create a user
-- row, and every id comparison in the app (`created_by = <clerk id>`) was a
-- type mismatch. This migration makes the public schema consistent with Clerk:
-- `public.users.id` and every foreign key pointing at it become `TEXT`.
--
-- `users_id_fkey` (the FK into `auth.users`) is dropped permanently. Clerk is
-- the identity provider; Supabase Auth is no longer in the request path.
--
-- ORDERING MATTERS. Postgres refuses to alter the type of a column that any
-- policy depends on:
--
--     ERROR: 0A000: cannot alter type of a column used in a policy definition
--     DETAIL: policy users_select_own on table users depends on column "id"
--
-- So every policy referencing a converted column is dropped in step 1, before
-- any ALTER TABLE, and recreated in step 5.
--
-- RLS policies that compared a `UUID` column to `auth.uid()` are rewritten to
-- compare against `(auth.jwt() ->> 'sub')`, which is the Clerk user id in the
-- Supabase session token. A `uuid = text` comparison is a runtime error, so
-- leaving them in place would break every authenticated read and write.

-- ---------------------------------------------------------------------------
-- 1. Drop every policy that depends on a column about to change type.
-- ---------------------------------------------------------------------------

-- users.id
DROP POLICY IF EXISTS users_select_own ON public.users;
DROP POLICY IF EXISTS users_update_own ON public.users;

-- seeded_campus_ids.claimed_by
DROP POLICY IF EXISTS seeded_campus_ids_update_claim ON public.seeded_campus_ids;

-- events.created_by
DROP POLICY IF EXISTS events_update_owner ON public.events;
DROP POLICY IF EXISTS events_delete_owner ON public.events;

-- event_registrations.student_id
DROP POLICY IF EXISTS event_registrations_select_own ON public.event_registrations;
DROP POLICY IF EXISTS event_registrations_insert_student ON public.event_registrations;
DROP POLICY IF EXISTS event_registrations_update_own ON public.event_registrations;
DROP POLICY IF EXISTS event_registrations_delete_own ON public.event_registrations;

-- concerns.student_id
DROP POLICY IF EXISTS concerns_select_own_student ON public.concerns;
DROP POLICY IF EXISTS concerns_insert_student ON public.concerns;
DROP POLICY IF EXISTS concerns_update_student ON public.concerns;

-- These two live on concern_messages but reference public.concerns.student_id
-- inside a subquery, so they also block the ALTER on concerns.
DROP POLICY IF EXISTS concern_messages_select_related ON public.concern_messages;
DROP POLICY IF EXISTS concern_messages_insert_student ON public.concern_messages;

-- lost_found_items.reported_by
DROP POLICY IF EXISTS lost_found_items_update_student ON public.lost_found_items;

-- notifications.user_id
DROP POLICY IF EXISTS notifications_select_own ON public.notifications;

-- ---------------------------------------------------------------------------
-- 2. Drop the foreign keys that reference public.users(id).
--    Postgres cannot change the type of a referenced column while dependent
--    foreign keys exist.
-- ---------------------------------------------------------------------------
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;

ALTER TABLE public.seeded_campus_ids DROP CONSTRAINT IF EXISTS seeded_campus_ids_claimed_by_fkey;
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_created_by_fkey;
ALTER TABLE public.event_registrations DROP CONSTRAINT IF EXISTS event_registrations_student_id_fkey;
ALTER TABLE public.concerns DROP CONSTRAINT IF EXISTS concerns_student_id_fkey;
ALTER TABLE public.concerns DROP CONSTRAINT IF EXISTS concerns_assigned_to_fkey;
ALTER TABLE public.concern_messages DROP CONSTRAINT IF EXISTS concern_messages_sender_id_fkey;
ALTER TABLE public.lost_found_items DROP CONSTRAINT IF EXISTS lost_found_items_reported_by_fkey;
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;

-- ---------------------------------------------------------------------------
-- 3. Convert the columns to TEXT.
--    The table is currently empty, so the casts have no legacy UUID rows to
--    reconcile. Any rows that do exist keep their UUID value as its text form.
-- ---------------------------------------------------------------------------
ALTER TABLE public.users ALTER COLUMN id TYPE TEXT USING id::text;

ALTER TABLE public.seeded_campus_ids ALTER COLUMN claimed_by TYPE TEXT USING claimed_by::text;
ALTER TABLE public.events ALTER COLUMN created_by TYPE TEXT USING created_by::text;
ALTER TABLE public.event_registrations ALTER COLUMN student_id TYPE TEXT USING student_id::text;
ALTER TABLE public.concerns ALTER COLUMN student_id TYPE TEXT USING student_id::text;
ALTER TABLE public.concerns ALTER COLUMN assigned_to TYPE TEXT USING assigned_to::text;
ALTER TABLE public.concern_messages ALTER COLUMN sender_id TYPE TEXT USING sender_id::text;
ALTER TABLE public.lost_found_items ALTER COLUMN reported_by TYPE TEXT USING reported_by::text;
ALTER TABLE public.notifications ALTER COLUMN user_id TYPE TEXT USING user_id::text;

-- ---------------------------------------------------------------------------
-- 4. Recreate the foreign keys as TEXT -> TEXT.
--    ON DELETE behaviour matches the original schema (NO ACTION).
-- ---------------------------------------------------------------------------
ALTER TABLE public.seeded_campus_ids ADD CONSTRAINT seeded_campus_ids_claimed_by_fkey
  FOREIGN KEY (claimed_by) REFERENCES public.users(id);

ALTER TABLE public.events ADD CONSTRAINT events_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.users(id);

ALTER TABLE public.event_registrations ADD CONSTRAINT event_registrations_student_id_fkey
  FOREIGN KEY (student_id) REFERENCES public.users(id);

ALTER TABLE public.concerns ADD CONSTRAINT concerns_student_id_fkey
  FOREIGN KEY (student_id) REFERENCES public.users(id);

ALTER TABLE public.concerns ADD CONSTRAINT concerns_assigned_to_fkey
  FOREIGN KEY (assigned_to) REFERENCES public.users(id);

ALTER TABLE public.concern_messages ADD CONSTRAINT concern_messages_sender_id_fkey
  FOREIGN KEY (sender_id) REFERENCES public.users(id);

ALTER TABLE public.lost_found_items ADD CONSTRAINT lost_found_items_reported_by_fkey
  FOREIGN KEY (reported_by) REFERENCES public.users(id);

ALTER TABLE public.notifications ADD CONSTRAINT notifications_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id);

-- ---------------------------------------------------------------------------
-- 5. Recreate the policies from step 1, now comparing against the Clerk id.
--    Semantics are otherwise unchanged.
-- ---------------------------------------------------------------------------

-- Users: own row only
CREATE POLICY users_select_own ON public.users
  FOR SELECT USING ((auth.jwt() ->> 'sub') = id);

CREATE POLICY users_update_own ON public.users
  FOR UPDATE USING ((auth.jwt() ->> 'sub') = id);

-- Seeded campus ids: claim your own
CREATE POLICY seeded_campus_ids_update_claim ON public.seeded_campus_ids
  FOR UPDATE USING (auth.role() = 'service_role' OR (auth.jwt() ->> 'sub') = claimed_by)
  WITH CHECK (auth.role() = 'service_role' OR (auth.jwt() ->> 'sub') = claimed_by);

-- Events: owner
CREATE POLICY events_update_owner ON public.events
  FOR UPDATE USING (created_by = (auth.jwt() ->> 'sub'))
  WITH CHECK (created_by = (auth.jwt() ->> 'sub'));

CREATE POLICY events_delete_owner ON public.events
  FOR DELETE USING (created_by = (auth.jwt() ->> 'sub'));

-- Event registrations: own rows only
CREATE POLICY event_registrations_select_own ON public.event_registrations
  FOR SELECT USING (student_id = (auth.jwt() ->> 'sub'));

CREATE POLICY event_registrations_insert_student ON public.event_registrations
  FOR INSERT WITH CHECK (student_id = (auth.jwt() ->> 'sub'));

CREATE POLICY event_registrations_update_own ON public.event_registrations
  FOR UPDATE USING (student_id = (auth.jwt() ->> 'sub'))
  WITH CHECK (student_id = (auth.jwt() ->> 'sub'));

CREATE POLICY event_registrations_delete_own ON public.event_registrations
  FOR DELETE USING (student_id = (auth.jwt() ->> 'sub'));

-- Concerns: student owns own, staff sees all
CREATE POLICY concerns_select_own_student ON public.concerns
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'student' AND
    student_id = (auth.jwt() ->> 'sub')
  );

CREATE POLICY concerns_insert_student ON public.concerns
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'role' = 'student' AND
    student_id = (auth.jwt() ->> 'sub')
  );

CREATE POLICY concerns_update_student ON public.concerns
  FOR UPDATE USING (
    student_id = (auth.jwt() ->> 'sub') AND
    auth.jwt() ->> 'role' = 'student'
  )
  WITH CHECK (
    student_id = (auth.jwt() ->> 'sub') AND
    auth.jwt() ->> 'role' = 'student'
  );

-- Concern messages: visible if you own the parent concern, or you are staff
CREATE POLICY concern_messages_select_related ON public.concern_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.concerns c
      WHERE c.id = concern_id AND (
        (auth.jwt() ->> 'role' = 'student' AND c.student_id = (auth.jwt() ->> 'sub')) OR
        (auth.jwt() ->> 'role' IN ('staff', 'admin'))
      )
    )
  );

CREATE POLICY concern_messages_insert_student ON public.concern_messages
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'role' = 'student' AND
    EXISTS (
      SELECT 1 FROM public.concerns c
      WHERE c.id = concern_id AND c.student_id = (auth.jwt() ->> 'sub')
    )
  );

-- Lost & found: owner
CREATE POLICY lost_found_items_update_student ON public.lost_found_items
  FOR UPDATE USING (
    reported_by = (auth.jwt() ->> 'sub') AND
    auth.jwt() ->> 'role' = 'student'
  )
  WITH CHECK (
    reported_by = (auth.jwt() ->> 'sub') AND
    auth.jwt() ->> 'role' = 'student'
  );

-- Notifications: own rows only
CREATE POLICY notifications_select_own ON public.notifications
  FOR SELECT USING (user_id = (auth.jwt() ->> 'sub'));

-- ---------------------------------------------------------------------------
-- Note: `events_insert_authenticated` is intentionally left in place
-- (`auth.role() IS NOT NULL`), so any signed-in user can still create events.
-- Tightening it to admin-only would match the announcements policies, but that
-- is a product decision rather than part of this type migration.
-- ---------------------------------------------------------------------------
