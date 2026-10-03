-- Notifications had only SELECT + INSERT policies, so any UPDATE from the app
-- matched 0 rows under RLS (PostgREST still returns 204) and "Mark all as read"
-- silently no-oped. Allow users to update their own rows only.
CREATE POLICY notifications_update_own ON public.notifications
  FOR UPDATE
  USING (user_id = (auth.jwt() ->> 'sub'))
  WITH CHECK (user_id = (auth.jwt() ->> 'sub'));
