-- Phase 4 findings (functional test §1, Events):
--
-- 1. CAPACITY BYPASS. `enforce_event_capacity` was SECURITY INVOKER, so its
--    `count(*)` ran under the caller's RLS. `event_registrations` only lets
--    you see your OWN rows, so every student counted 0 and sailed through:
--    proven on the live project — a capacity-1 event accepted TWO rows via
--    real Clerk session tokens (2/1 seats), while the service-role path
--    correctly raised 23514. SECURITY DEFINER makes the count see every row
--    (same pattern as the five notification triggers). The explicit
--    `search_path` pins the qualified `public.*` references.
--
-- 2. REGISTRATION ROWS WERE UNREADABLE TO EVERYONE BUT THEIR OWNER. The only
--    SELECT policy was `..._select_own`, which meant:
--      * guests/students saw `registered = 0` on every seat counter
--        (the list embed and the detail-page count are both RLS-filtered),
--      * admins got an empty registrants list ("No registrants found" while
--        two rows existed) — test case "Admin views registrants list" failed.
--    Public read matches this app's existing posture: `lost_found_items`
--    already exposes its `reported_by` Clerk id to anon, and the only columns
--    here are an opaque Clerk id + event id + status/timestamp. Names and
--    emails stay protected by the `users` table's own RLS (the registrant
--    screen's join resolves only for admins via `users_select_admin`).
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP POLICY IF EXISTS event_registrations_select_own ON public.event_registrations;
DROP POLICY IF EXISTS event_registrations_select_public ON public.event_registrations;
CREATE POLICY event_registrations_select_public ON public.event_registrations
  FOR SELECT USING (true);
