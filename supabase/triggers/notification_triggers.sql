-- Trigger function for announcements
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

        -- Get users with target roles (excluding the creator)
        FOR user_record IN
            SELECT u.* FROM public.users u
            WHERE u.role = ANY(target_roles) AND u.id != NEW.created_by
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

-- Trigger for announcements
DROP TRIGGER IF EXISTS announce_notification_trigger ON public.announcements;
CREATE TRIGGER announce_notification_trigger
AFTER INSERT ON public.announcements
FOR EACH ROW
WHEN (NEW.status = 'published')
EXECUTE FUNCTION public.notify_on_announcement_insert();


-- Trigger function for event updates
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

        -- Don't notify if the user making the change is the same as the registered user
        IF user_record.id != NEW.created_by THEN
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

-- Trigger for events
DROP TRIGGER IF EXISTS event_update_notification_trigger ON public.events;
CREATE TRIGGER event_update_notification_trigger
AFTER UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_event_update();


-- Trigger function for concern status updates
CREATE OR REPLACE FUNCTION public.notify_on_concern_update()
RETURNS TRIGGER AS $$
DECLARE
    student_record RECORD;
BEGIN
    -- Notify student when concern status is updated
    IF OLD.status != NEW.status THEN
        -- Get the student who submitted the concern
        SELECT * INTO student_record FROM public.users u WHERE u.id = NEW.student_id;

        -- Don't notify if the user making the change is the student themselves
        IF student_record.id != NEW.assigned_to THEN
            INSERT INTO public.notifications (user_id, type, title, body, related_id)
            VALUES (
                student_record.id,
                'concern',
                'Concern Status Updated: ' || NEW.subject,
                'Your concern "' || NEW.subject || '" has been updated to "' || NEW.status || '".',
                NEW.id
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for concerns
DROP TRIGGER IF EXISTS concern_update_notification_trigger ON public.concerns;
CREATE TRIGGER concern_update_notification_trigger
AFTER UPDATE ON public.concerns
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_concern_update();


-- Trigger function for new concern messages (replies)
CREATE OR REPLACE FUNCTION public.notify_on_concern_message_insert()
RETURNS TRIGGER AS $$
DECLARE
    concern_record RECORD;
    sender_record RECORD;
    recipient_id UUID;
BEGIN
    -- Get the concern details
    SELECT * INTO concern_record FROM public.concerns c WHERE c.id = NEW.concern_id;

    -- Get the sender details
    SELECT * INTO sender_record FROM public.users u WHERE u.id = NEW.sender_id;

    -- Determine recipient (student if sender is staff, staff if sender is student)
    IF (SELECT role FROM public.users WHERE id = concern_record.student_id) = 'student' THEN
        -- If concern belongs to a student
        IF sender_record.role IN ('staff', 'admin') THEN
            -- Sender is staff, recipient is student
            recipient_id := concern_record.student_id;
        ELSE
            -- Sender is student, recipient is staff/admin (we'll notify all staff/admins for simplicity)
            -- In a real app, you might want to notify only the assigned staff
            INSERT INTO public.notifications (user_id, type, title, body, related_id)
            SELECT
                u.id,
                'concern',
                'New Reply: ' || concern_record.subject,
                'You have a new reply on your concern "' || concern_record.subject || '" from ' || sender_record.full_name,
                NEW.concern_id
            FROM public.users u
            WHERE u.role IN ('staff', 'admin');

            RETURN NEW;
        END IF;
    ELSE
        -- If concern belongs to staff (edge case)
        IF sender_record.role = 'student' THEN
            -- Sender is student, notify staff
            INSERT INTO public.notifications (user_id, type, title, body, related_id)
            SELECT
                u.id,
                'concern',
                'New Reply: ' || concern_record.subject,
                'You have a new reply on concern "' || concern_record.subject || '" from ' || sender_record.full_name,
                NEW.concern_id
            FROM public.users u
            WHERE u.role IN ('staff', 'admin');

            RETURN NEW;
        END IF;
    END IF;

    -- If we have a specific recipient
    IF recipient_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, type, title, body, related_id)
        VALUES (
            recipient_id,
            'concern',
            'New Reply: ' || concern_record.subject,
            'You have a new reply on your concern "' || concern_record.subject || '" from ' || sender_record.full_name,
            NEW.concern_id
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for concern messages
DROP TRIGGER IF EXISTS concern_message_notification_trigger ON public.concern_messages;
CREATE TRIGGER concern_message_notification_trigger
AFTER INSERT ON public.concern_messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_concern_message_insert();


-- Trigger function for lost & found status updates (when claimed)
CREATE OR REPLACE FUNCTION public.notify_on_lost_found_update()
RETURNS TRIGGER AS $$
DECLARE
    reporter_record RECORD;
    updater_record RECORD;
BEGIN
    -- Notify reporter when item status changes to claimed
    IF OLD.status != NEW.status AND NEW.status = 'claimed' THEN
        -- Get the reporter
        SELECT * INTO reporter_record FROM public.users u WHERE u.id = NEW.reported_by;

        -- Get the user who updated the status (claimer)
        SELECT * INTO updater_record FROM public.users u WHERE u.id = NEW.reported_by; -- This would need to be set by the updater

        -- For now, we'll just notify the reporter that their item was claimed
        -- In a real app, you'd want to know who claimed it
        IF reporter_record.id IS NOT NULL THEN
            INSERT INTO public.notifications (user_id, type, title, body, related_id)
            VALUES (
                reporter_record.id,
                'lost_found',
                'Item Claimed: ' || NEW.name,
                'Your item "' || NEW.name || '" has been claimed by someone.',
                NEW.id
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for lost & found items
DROP TRIGGER IF EXISTS lost_found_update_notification_trigger ON public.lost_found_items;
CREATE TRIGGER lost_found_update_notification_trigger
AFTER UPDATE ON public.lost_found_items
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_lost_found_update();