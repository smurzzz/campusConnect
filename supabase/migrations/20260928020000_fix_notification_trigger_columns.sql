-- Fixes: every notification trigger inserts into columns that do not exist.
--
-- `public.notifications` has exactly these columns:
--     id, user_id, type, message, read, related_id, created_at
-- (verified against the live schema; `title`, `body` and `is_read` are absent)
--
-- But 20260927100002 inserted into `(user_id, type, title, body, related_id)`
-- in all five trigger functions. Every one of those statements would abort with
--
--     ERROR: column "title" of relation "notifications" does not exist
--
-- It has never surfaced because `public.users` is still empty: each function
-- iterates a `SELECT ... FROM public.users` cursor, and an empty cursor means
-- the broken INSERT is never reached. The moment the Clerk -> users sync
-- populates `public.users`, publishing an announcement, editing an event,
-- changing a concern status, replying to a concern, or claiming a lost & found
-- item would all fail.
--
-- Fix: write the human-readable text into the single `message` column, keeping
-- the subject/heading the old `title` argument carried so no information is
-- lost. The schemas stay aligned with `docs/02-ARCHITECTURE.md` section 5 and
-- `lib/supabase.ts` rather than being widened to fit the triggers.

-- ---------------------------------------------------------------------------
-- 1. Announcements
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_on_announcement_insert()
RETURNS TRIGGER AS $$
DECLARE
    target_roles TEXT[];
    user_record RECORD;
BEGIN
    IF NEW.status = 'published' THEN
        CASE NEW.audience
            WHEN 'Everyone' THEN target_roles := ARRAY['student', 'staff', 'admin'];
            WHEN 'Students only' THEN target_roles := ARRAY['student'];
            WHEN 'Personnel only' THEN target_roles := ARRAY['staff', 'admin'];
            ELSE target_roles := ARRAY['student', 'staff', 'admin'];
        END CASE;

        FOR user_record IN
            SELECT u.* FROM public.users u
            WHERE u.role = ANY(target_roles)
              AND NOT (NEW.created_by IS NOT NULL AND u.id::text = NEW.created_by)
        LOOP
            INSERT INTO public.notifications (user_id, type, message, related_id)
            VALUES (
                user_record.id,
                'announcement',
                NEW.title || ' — ' || CASE
                    WHEN LENGTH(NEW.body) > 140 THEN SUBSTRING(NEW.body FROM 1 FOR 140) || '…'
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
-- 2. Event updates
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_on_event_update()
RETURNS TRIGGER AS $$
DECLARE
    registration_record RECORD;
    user_record RECORD;
BEGIN
    FOR registration_record IN
        SELECT er.* FROM public.event_registrations er
        WHERE er.event_id = NEW.id
    LOOP
        SELECT * INTO user_record FROM public.users u WHERE u.id = registration_record.student_id;

        IF NOT (NEW.created_by IS NOT NULL AND user_record.id::text = NEW.created_by) THEN
            INSERT INTO public.notifications (user_id, type, message, related_id)
            VALUES (
                user_record.id,
                'event',
                'Update: ' || NEW.title || ' — the event "' || NEW.title ||
                    '" has been updated. Check for changes in time, location, or description.',
                NEW.id
            );
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- 3. Concern status updates
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_on_concern_update()
RETURNS TRIGGER AS $$
DECLARE
    student_record RECORD;
BEGIN
    IF OLD.status != NEW.status THEN
        SELECT * INTO student_record FROM public.users u WHERE u.id = NEW.student_id;

        IF student_record.id IS NOT NULL AND student_record.id::text IS DISTINCT FROM NEW.assigned_to::text THEN
            INSERT INTO public.notifications (user_id, type, message, related_id)
            VALUES (
                student_record.id,
                'concern',
                'Concern Status Updated: ' || NEW.subject || ' — your concern "' ||
                    NEW.subject || '" has been updated to "' || NEW.status || '".',
                NEW.id
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- 4. Concern replies
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_on_concern_message_insert()
RETURNS TRIGGER AS $$
DECLARE
    concern_record RECORD;
    sender_record RECORD;
    recipient_id UUID;
    reply_text TEXT;
BEGIN
    SELECT * INTO concern_record FROM public.concerns c WHERE c.id = NEW.concern_id;
    SELECT * INTO sender_record FROM public.users u WHERE u.id = NEW.sender_id;

    reply_text := 'New Reply: ' || concern_record.subject ||
        ' — you have a new reply on your concern "' || concern_record.subject ||
        '" from ' || COALESCE(sender_record.full_name, 'a staff member');

    IF (SELECT role FROM public.users WHERE id = concern_record.student_id) = 'student' THEN
        IF sender_record.role IN ('staff', 'admin') THEN
            recipient_id := concern_record.student_id;
        ELSE
            INSERT INTO public.notifications (user_id, type, message, related_id)
            SELECT u.id, 'concern', reply_text, NEW.concern_id
            FROM public.users u
            WHERE u.role IN ('staff', 'admin');

            RETURN NEW;
        END IF;
    ELSE
        IF sender_record.role = 'student' THEN
            INSERT INTO public.notifications (user_id, type, message, related_id)
            SELECT u.id, 'concern', reply_text, NEW.concern_id
            FROM public.users u
            WHERE u.role IN ('staff', 'admin');

            RETURN NEW;
        END IF;
    END IF;

    IF recipient_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, type, message, related_id)
        VALUES (recipient_id, 'concern', reply_text, NEW.concern_id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- 5. Lost & found claims
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_on_lost_found_update()
RETURNS TRIGGER AS $$
DECLARE
    reporter_record RECORD;
BEGIN
    IF OLD.status != NEW.status AND NEW.status = 'claimed' THEN
        SELECT * INTO reporter_record FROM public.users u WHERE u.id = NEW.reported_by;

        IF reporter_record.id IS NOT NULL THEN
            INSERT INTO public.notifications (user_id, type, message, related_id)
            VALUES (
                reporter_record.id,
                'lost_found',
                'Item Claimed: ' || NEW.name || ' — your item "' || NEW.name ||
                    '" has been claimed by someone.',
                NEW.id
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
