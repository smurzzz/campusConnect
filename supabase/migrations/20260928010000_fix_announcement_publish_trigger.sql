-- Fixes: publishing an announcement is impossible.
--
-- `notify_on_announcement_insert` is an AFTER INSERT trigger with
-- `WHEN (NEW.status = 'published')`, so it only fires on publish. Its body
-- contained:
--
--     WHERE u.role = ANY(target_roles) AND u.id != NEW.created_by
--
-- `public.users.id` is a UUID, but 20260928000000 widened
-- `announcements.created_by` to TEXT to hold Clerk ids (`user_2abc...`).
-- `uuid <> text` has no operator, so every insert with a published status
-- aborted with:
--
--     ERROR: operator does not exist: uuid <> text
--
-- Draft inserts were unaffected because the trigger's WHEN clause is false
-- for them, which is why this only surfaced on publish.
--
-- The comparison is now made in text, which is correct for either id space:
-- `u.id::text` still matches a legacy UUID and also matches a Clerk id once
-- `public.users` is migrated.
--
-- `notify_on_event_update` has the same `uuid != created_by` shape and is
-- hardened here too. `events.created_by` is still a UUID today, so it is not
-- currently broken, but the identical migration would break it later.

-- ---------------------------------------------------------------------------
-- 1. Announcements: text-safe author comparison.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_on_announcement_insert()
RETURNS TRIGGER AS $$
DECLARE
    target_roles TEXT[];
    user_record RECORD;
BEGIN
    -- Only notify if published
    IF NEW.status = 'published' THEN
        -- Determine target roles based on audience
        CASE NEW.audience
            WHEN 'Everyone' THEN target_roles := ARRAY['student', 'staff', 'admin'];
            WHEN 'Students only' THEN target_roles := ARRAY['student'];
            WHEN 'Personnel only' THEN target_roles := ARRAY['staff', 'admin'];
            ELSE target_roles := ARRAY['student', 'staff', 'admin'];
        END CASE;

        -- Get users with target roles, excluding the author.
        -- `NOT (a IS NOT NULL AND b = c)` keeps rows when created_by is NULL,
        -- because `NOT NULL` is NULL (falsy) and would wrongly drop everyone.
        FOR user_record IN
            SELECT u.* FROM public.users u
            WHERE u.role = ANY(target_roles)
              AND NOT (NEW.created_by IS NOT NULL AND u.id::text = NEW.created_by)
        LOOP
            INSERT INTO public.notifications (user_id, type, title, body, related_id)
            VALUES (
                user_record.id,
                'announcement',
                NEW.title,
                CASE
                    WHEN LENGTH(NEW.body) > 100 THEN SUBSTRING(NEW.body FROM 1 FOR 100) || '...'
                    ELSE NEW.body
                END,
                NEW.id
            );
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- 2. Events: same comparison, fixed ahead of time.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_on_event_update()
RETURNS TRIGGER AS $$
DECLARE
    registration_record RECORD;
    user_record RECORD;
BEGIN
    -- Notify registered users when event is updated
    FOR registration_record IN
        SELECT er.* FROM public.event_registrations er
        WHERE er.event_id = NEW.id
    LOOP
        -- Get user details
        SELECT * INTO user_record FROM public.users u WHERE u.id = registration_record.student_id;

        -- Don't notify the person who made the change
        IF NOT (NEW.created_by IS NOT NULL AND user_record.id::text = NEW.created_by) THEN
            INSERT INTO public.notifications (user_id, type, title, body, related_id)
            VALUES (
                user_record.id,
                'event',
                'Update: ' || NEW.title,
                'The event "' || NEW.title || '" has been updated. Check for changes in time, location, or description.',
                NEW.id
            );
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
