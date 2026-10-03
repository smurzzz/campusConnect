-- Phase 4 security test (scripts/test-role-tampering.mjs) found that
-- `users_update_own` lets any signed-in user rewrite their OWN row — including
-- the `role` and `status` columns. RLS role checks never read this column
-- (every policy and `useRole()` read the signed Clerk token via
-- public.jwt_role()), so it granted no privileges; but a student could mark
-- their row `role='admin'` / `status='active'` and pollute admin tables,
-- report joins, and assignment dropdowns — data-integrity, not escalation.
--
-- No client code updates `users`: profile edits write Clerk `unsafeMetadata`,
-- and the webhook / role / status routes all use the service-role key, which
-- bypasses RLS and is unaffected by this trigger. Column-level REVOKE would
-- also work, but a trigger keeps the existing `users_update_own` policy
-- (self-service contact info) intact while refusing only the privileged
-- columns — and it names the violation clearly.
CREATE OR REPLACE FUNCTION public.users_guard_privileged_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.role IS DISTINCT FROM OLD.role OR NEW.status IS DISTINCT FROM OLD.status)
     AND COALESCE(public.jwt_role(), '') <> 'admin' THEN
    RAISE EXCEPTION 'users.role and users.status can only be changed by an admin'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_guard_privileged_columns ON public.users;
CREATE TRIGGER users_guard_privileged_columns
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.users_guard_privileged_columns();
