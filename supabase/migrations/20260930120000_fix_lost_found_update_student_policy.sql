-- lost_found_items_update_student compared the RAW `role` JWT claim against
-- 'student'. With the Clerk third-party auth integration active, the session
-- token's top-level `role` claim is always the Postgres role "authenticated"
-- (required by Supabase), so this policy could never match a student and the
-- student-owned update path was dead.
--
-- Switch it to the canonical public.jwt_role() helper (top-level `role` first,
-- then `metadata.role` from Clerk publicMetadata) used by every other
-- student-scoped policy.

DROP POLICY IF EXISTS "lost_found_items_update_student" ON public.lost_found_items;

CREATE POLICY "lost_found_items_update_student" ON public.lost_found_items
  FOR UPDATE USING (
    reported_by = (auth.jwt() ->> 'sub')
    AND public.jwt_role() = 'student'
  );
