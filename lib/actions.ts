'use server';

import { supabase } from '@/lib/supabase';
// A React hook cannot be called inside a server action. `auth()` is the
// server-side equivalent and returns the same Clerk user id.
import { auth } from '@clerk/nextjs/server';

export async function registerForEvent(eventId: string) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error('User not authenticated');
  }


  // Check if already registered
  const { data: existingRegistration, error: checkError } = await supabase
    .from('event_registrations')
    .select('id')
    .eq('event_id', eventId)
    .eq('student_id', userId)
    .single();

  if (checkError && checkError.code !== 'PGRST116') { // PGRST116 means no rows returned
    throw new Error('Failed to check registration status');
  }

  if (existingRegistration) {
    throw new Error('Already registered for this event');
  }

  // Check event capacity
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('capacity')
    .eq('id', eventId)
    .single();

  if (eventError) throw eventError;

  if (!event) {
    throw new Error('Event not found');
  }

  // Count current registrations
  const { data: countData, error: countError } = await supabase
    .from('event_registrations')
    .select('id', { count: 'exact' })
    .eq('event_id', eventId);

  if (countError) throw countError;

  const currentCount = countData?.length ?? 0;

  if (currentCount >= event.capacity) {
    throw new Error('Event is at full capacity');
  }

  // Register for event
  const { data, error } = await supabase
    .from('event_registrations')
    .insert({
      event_id: eventId,
      student_id: userId,
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function unregisterFromEvent(eventId: string) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error('User not authenticated');
  }

  const { error } = await supabase
    .from('event_registrations')
    .delete()
    .eq('event_id', eventId)
    .eq('student_id', userId);

  if (error) throw error;
}

export async function getEventRegistrations(eventId: string) {
  const { data, error } = await supabase
    .from('event_registrations')
    .select(`
      id,
      student_id,
      registered_at,
      status,
      student:users!event_registrations_student_id_fkey (
        id,
        full_name,
        email,
        campus_id
      )
    `)
    .eq('event_id', eventId)
    .order('registered_at', { ascending: true });

  if (error) throw error;
  return data;
}
