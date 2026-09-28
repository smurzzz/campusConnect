-- Add the `status` column that the admin user-management UI already depends on.
--
-- `lib/actions.ts` `deactivateUser`/`activateUser` write `status` to
-- `public.users`, and `app/(app)/admin/users/[id]` selects it, but the column
-- was never created, so the admin user detail page failed its query outright
-- and the deactivate/activate buttons were non-functional.
--
-- This is a soft flag only. It does not block Clerk sign-in; doing that would
-- require Clerk's ban or session-revocation APIs, which is a separate change.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_status_check'
      AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_status_check
      CHECK (status IN ('active', 'deactivated'));
  END IF;
END $$;
