-- With the Clerk third-party auth integration active, the session token's
-- TOP-LEVEL `role` claim must be the Postgres role "authenticated" (required
-- by Supabase). jwt_role() previously preferred that top-level claim, so it
-- now always resolves to "authenticated" and every student/staff policy
-- fails. The application role lives in Clerk publicMetadata, surfaced in the
-- session token under `metadata` (Clerk session-token editor:
-- "metadata": {{user.public_metadata}}), so the lookup order is inverted:
-- metadata.role wins, top-level role is a legacy fallback only.

CREATE OR REPLACE FUNCTION public.jwt_role()
RETURNS TEXT AS $$
    SELECT COALESCE(
        auth.jwt() -> 'metadata' ->> 'role',
        CASE
            WHEN auth.jwt() ->> 'role' IN ('student', 'personnel', 'admin', 'staff') THEN auth.jwt() ->> 'role'
            ELSE NULL
        END
    );
$$ LANGUAGE sql STABLE;
