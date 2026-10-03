-- Regression fix for 20261002120000: the guard compared only public.jwt_role()
-- against 'admin', but the service-role key's JWT carries top-level
-- role='service_role' and NO metadata claim, so jwt_role() resolved to NULL
-- and every service-role role/status write was refused. That broke:
--   * the Clerk webhook's user provisioning upsert (writes role='student'),
--   * PUT /api/users/[id]/role  (admin role changes),
--   * PUT /api/users/[id]/status (deactivation).
-- Verified before this fix: service PATCH student->personnel returned 42501.
--
-- Rule now: block only JWT-carrying callers that are neither the service key
-- nor an admin. Direct SQL sessions (no request JWT, e.g. psql migrations)
-- pass untouched; students/personnel (top-level 'authenticated' + metadata
-- role) are still refused.
CREATE OR REPLACE FUNCTION public.users_guard_privileged_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.role IS DISTINCT FROM OLD.role OR NEW.status IS DISTINCT FROM OLD.status)
     AND auth.jwt() IS NOT NULL
     AND COALESCE(auth.jwt() ->> 'role', '') <> 'service_role'
     AND COALESCE(public.jwt_role(), '') <> 'admin' THEN
    RAISE EXCEPTION 'users.role and users.status can only be changed by an admin'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
