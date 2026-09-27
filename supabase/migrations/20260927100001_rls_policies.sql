-- Users table policies
CREATE POLICY "users_select_own" ON public.users
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_update_own" ON public.users
FOR UPDATE USING (auth.uid() = id);

-- Seeded Campus IDs table policies
CREATE POLICY "seeded_campus_ids_select_all" ON public.seeded_campus_ids
FOR SELECT USING (true);

CREATE POLICY "seeded_campus_ids_update_claim" ON public.seeded_campus_ids
FOR UPDATE USING (auth.role() = 'service_role' OR auth.uid() = claimed_by)
WITH CHECK (auth.role() = 'service_role' OR auth.uid() = claimed_by);

-- Announcements table policies
CREATE POLICY "announcements_select_public" ON public.announcements
FOR SELECT USING (status = 'published');

CREATE POLICY "announcements_select_authenticated" ON public.announcements
FOR SELECT USING (auth.role() IS NOT NULL);

CREATE POLICY "announcements_insert_admin" ON public.announcements
FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "announcements_update_admin" ON public.announcements
FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin')
WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "announcements_delete_admin" ON public.announcements
FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- Events table policies
CREATE POLICY "events_select_public" ON public.events
FOR SELECT USING (true);

CREATE POLICY "events_insert_authenticated" ON public.events
FOR INSERT WITH CHECK (auth.role() IS NOT NULL);

CREATE POLICY "events_update_owner" ON public.events
FOR UPDATE USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

CREATE POLICY "events_delete_owner" ON public.events
FOR DELETE USING (created_by = auth.uid());

-- Event registrations table policies
CREATE POLICY "event_registrations_select_own" ON public.event_registrations
FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "event_registrations_insert_student" ON public.event_registrations
FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "event_registrations_update_own" ON public.event_registrations
FOR UPDATE USING (student_id = auth.uid())
WITH CHECK (student_id = auth.uid());

CREATE POLICY "event_registrations_delete_own" ON public.event_registrations
FOR DELETE USING (student_id = auth.uid());

-- Concerns table policies
CREATE POLICY "concerns_select_own_student" ON public.concerns
FOR SELECT USING (
    auth.jwt() ->> 'role' = 'student' AND
    student_id = auth.uid()
);

CREATE POLICY "concerns_select_staff" ON public.concerns
FOR SELECT USING (
    auth.jwt() ->> 'role' IN ('staff', 'admin')
);

CREATE POLICY "concerns_insert_student" ON public.concerns
FOR INSERT WITH CHECK (
    auth.jwt() ->> 'role' = 'student' AND
    student_id = auth.uid()
);

CREATE POLICY "concerns_update_student" ON public.concerns
FOR UPDATE USING (
    student_id = auth.uid() AND
    auth.jwt() ->> 'role' = 'student'
)
WITH CHECK (
    student_id = auth.uid() AND
    auth.jwt() ->> 'role' = 'student'
);

CREATE POLICY "concerns_update_staff" ON public.concerns
FOR UPDATE USING (
    auth.jwt() ->> 'role' IN ('staff', 'admin')
)
WITH CHECK (
    auth.jwt() ->> 'role' IN ('staff', 'admin')
);

CREATE POLICY "concerns_delete_admin" ON public.concerns
FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- Concern messages table policies
CREATE POLICY "concern_messages_select_related" ON public.concern_messages
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.concerns c
        WHERE c.id = concern_id AND (
            (auth.jwt() ->> 'role' = 'student' AND c.student_id = auth.uid()) OR
            (auth.jwt() ->> 'role' IN ('staff', 'admin'))
        )
    )
);

CREATE POLICY "concern_messages_insert_student" ON public.concern_messages
FOR INSERT WITH CHECK (
    auth.jwt() ->> 'role' = 'student' AND
    EXISTS (
        SELECT 1 FROM public.concerns c
        WHERE c.id = concern_id AND c.student_id = auth.uid()
    )
);

CREATE POLICY "concern_messages_insert_staff" ON public.concern_messages
FOR INSERT WITH CHECK (
    auth.jwt() ->> 'role' IN ('staff', 'admin') AND
    EXISTS (
        SELECT 1 FROM public.concerns c
        WHERE c.id = concern_id
    )
);

-- Lost & Found items table policies
CREATE POLICY "lost_found_items_select_public" ON public.lost_found_items
FOR SELECT USING (true);

CREATE POLICY "lost_found_items_insert_student" ON public.lost_found_items
FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'student');

CREATE POLICY "lost_found_items_update_student" ON public.lost_found_items
FOR UPDATE USING (
    reported_by = auth.uid() AND
    auth.jwt() ->> 'role' = 'student'
)
WITH CHECK (
    reported_by = auth.uid() AND
    auth.jwt() ->> 'role' = 'student'
);

CREATE POLICY "lost_found_items_update_staff" ON public.lost_found_items
FOR UPDATE USING (auth.jwt() ->> 'role' IN ('staff', 'admin'))
WITH CHECK (auth.jwt() ->> 'role' IN ('staff', 'admin'));

-- Notifications table policies
CREATE POLICY "notifications_select_own" ON public.notifications
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "notifications_insert_app" ON public.notifications
FOR INSERT WITH CHECK (auth.role() = 'service_role');