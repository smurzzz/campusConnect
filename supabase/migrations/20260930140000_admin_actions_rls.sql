-- Functionality gaps for screens 33 (admin lost & found delete) and 35
-- (admin campus-ID management): the admin role had no DELETE path on
-- lost_found_items and no INSERT/DELETE on seeded_campus_ids, so those
-- admin actions were impossible under RLS. Admin authority is the same
-- public.jwt_role() helper every other policy uses.

-- Admins may archive/delete lost & found reports (personnel can only update
-- status; students their own rows — unchanged).
DROP POLICY IF EXISTS "lost_found_items_delete_admin" ON public.lost_found_items;
CREATE POLICY "lost_found_items_delete_admin" ON public.lost_found_items
  FOR DELETE USING (public.jwt_role() = 'admin');

-- Admins may allocate new campus IDs and delete UNCLAIMED ones. Deleting a
-- claimed ID would orphan the linked account's lookup path, so the DELETE
-- policy explicitly excludes claimed rows at the row level.
DROP POLICY IF EXISTS "seeded_campus_ids_insert_admin" ON public.seeded_campus_ids;
CREATE POLICY "seeded_campus_ids_insert_admin" ON public.seeded_campus_ids
  FOR INSERT TO authenticated
  WITH CHECK (public.jwt_role() = 'admin');

DROP POLICY IF EXISTS "seeded_campus_ids_delete_admin" ON public.seeded_campus_ids;
CREATE POLICY "seeded_campus_ids_delete_admin" ON public.seeded_campus_ids
  FOR DELETE TO authenticated
  USING (public.jwt_role() = 'admin' AND is_claimed = false);
