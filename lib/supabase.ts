import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * Anon client with no session. Only safe for public reads (published
 * announcements/events) — RLS sees `anon` and rejects every write.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Client that presents the Clerk session token as the Supabase access token.
 * Every write goes through this so RLS sees a real `auth.uid()` and the
 * `role` claim from the session token's public metadata — without it the
 * admin policies (`auth.jwt() ->> 'role' = 'admin'`) can never pass.
 */
export function createAuthedSupabaseClient(
  getToken: () => Promise<string | null>,
): SupabaseClient<Database> {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    accessToken: async () => (await getToken()) ?? supabaseAnonKey,
  })
}

// Types for our database tables
export type Database = {
  public: {
    Tables: {
      announcements: {
        Row: {
          id: string
          title: string
          category: string | null
          body: string
          status: string
          audience: string | null
          image_url: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          category?: string | null
          body: string
          status?: string
          audience?: string | null
          image_url?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          category?: string | null
          body?: string
          status?: string
          audience?: string | null
          image_url?: string | null
          created_by?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      concerns: {
        Row: {
          id: string
          subject: string
          category: string | null
          description: string
          status: string
          student_id: string
          assigned_to: string | null
          attachment_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          subject: string
          category?: string | null
          description: string
          status?: string
          student_id?: string
          assigned_to?: string | null
          attachment_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          subject?: string
          category?: string | null
          description?: string
          status?: string
          student_id?: string
          assigned_to?: string | null
          attachment_url?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "concerns_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concerns_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      event_registrations: {
        Row: {
          id: string
          event_id: string
          student_id: string
          registered_at: string
          status: string
        }
        Insert: {
          id?: string
          event_id?: string
          student_id?: string
          registered_at?: string
          status?: string
        }
        Update: {
          id?: string
          event_id?: string
          student_id?: string
          registered_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      concern_messages: {
        Row: {
          id: string
          concern_id: string | null
          sender_id: string | null
          message: string
          created_at: string
        }
        Insert: {
          id?: string
          concern_id?: string | null
          sender_id?: string | null
          message: string
          created_at?: string
        }
        Update: {
          id?: string
          concern_id?: string | null
          sender_id?: string | null
          message?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "concern_messages_concern_id_fkey"
            columns: ["concern_id"]
            isOneToOne: false
            referencedRelation: "concerns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concern_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      events: {
        Row: {
          id: string
          title: string
          description: string | null
          category: string | null
          location: string | null
          start_time: string
          end_time: string
          capacity: number | null
          cover_image_url: string | null
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          category?: string | null
          location?: string | null
          start_time?: string
          end_time?: string
          capacity?: number | null
          cover_image_url?: string | null
          created_by?: string
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          category?: string | null
          location?: string | null
          start_time?: string
          end_time?: string
          capacity?: number | null
          cover_image_url?: string | null
          created_by?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      lost_found_items: {
        Row: {
          id: string
          type: string
          name: string
          description: string | null
          category: string | null
          location: string | null
          date: string
          photo_url: string | null
          status: string
          reported_by: string
          created_at: string
        }
        Insert: {
          id?: string
          type: string
          name: string
          description?: string | null
          category?: string | null
          location?: string | null
          date?: string
          photo_url?: string | null
          status?: string
          reported_by?: string
          created_at?: string
        }
        Update: {
          id?: string
          type?: string
          name?: string
          description?: string | null
          category?: string | null
          location?: string | null
          date?: string
          photo_url?: string | null
          status?: string
          reported_by?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lost_found_items_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string | null
          message: string
          read: boolean
          related_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          type?: string | null
          message?: string
          read?: boolean
          related_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string | null
          message?: string
          read?: boolean
          related_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      seeded_campus_ids: {
        Row: {
          id: string
          campus_id: string
          is_claimed: boolean
          claimed_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          campus_id: string
          is_claimed?: boolean
          claimed_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          campus_id?: string
          is_claimed?: boolean
          claimed_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seeded_campus_ids_claimed_by_fkey"
            columns: ["claimed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      users: {
        Row: {
          id: string
          full_name: string | null
          email: string | null
          campus_id: string | null
          role: string
          status: string
          avatar_url: string | null
          contact_number: string | null
          created_at: string
        }
        Insert: {
          id?: string
          full_name?: string | null
          email?: string | null
          campus_id?: string | null
          role?: string
          status?: string
          avatar_url?: string | null
          contact_number?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          email?: string | null
          campus_id?: string | null
          role?: string
          status?: string
          avatar_url?: string | null
          contact_number?: string | null
          created_at?: string
        }
        // The `users_id_fkey` relationship into `auth.users` is intentionally
        // absent: identity is owned by Clerk, and that foreign key was dropped
        // in 20260928030000_migrate_users_id_to_clerk_text.sql.
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper functions for common queries
export async function getAnnouncements() {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getAnnouncementById(id: string) {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createAnnouncement(announcement: Database['public']['Tables']['announcements']['Insert']) {
  const { data, error } = await supabase
    .from('announcements')
    .insert(announcement)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateAnnouncement(id: string, announcement: Database['public']['Tables']['announcements']['Update']) {
  const { data, error } = await supabase
    .from('announcements')
    .update(announcement)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteAnnouncement(id: string) {
  const { error } = await supabase
    .from('announcements')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Events
export async function getEvents() {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('start_time', { ascending: false })

  if (error) throw error
  return data
}

export async function getEventById(id: string) {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createEvent(event: Database['public']['Tables']['events']['Insert']) {
  const { data, error } = await supabase
    .from('events')
    .insert(event)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateEvent(id: string, event: Database['public']['Tables']['events']['Update']) {
  const { data, error } = await supabase
    .from('events')
    .update(event)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteEvent(id: string) {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Event registrations
export async function getEventRegistrationsByEventId(eventId: string) {
  const { data, error } = await supabase
    .from('event_registrations')
    .select('*')
    .eq('event_id', eventId)

  if (error) throw error
  return data
}

export async function createEventRegistration(registration: Database['public']['Tables']['event_registrations']['Insert']) {
  const { data, error } = await supabase
    .from('event_registrations')
    .insert(registration)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteEventRegistration(id: string) {
  const { error } = await supabase
    .from('event_registrations')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Concerns
export async function getConcerns() {
  const { data, error } = await supabase
    .from('concerns')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getConcernById(id: string) {
  const { data, error } = await supabase
    .from('concerns')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createConcern(concern: Database['public']['Tables']['concerns']['Insert']) {
  const { data, error } = await supabase
    .from('concerns')
    .insert(concern)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateConcern(id: string, concern: Database['public']['Tables']['concerns']['Update']) {
  const { data, error } = await supabase
    .from('concerns')
    .update(concern)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteConcern(id: string) {
  const { error } = await supabase
    .from('concerns')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Concern messages
export async function getConcernMessagesByConcernId(concernId: string) {
  const { data, error } = await supabase
    .from('concern_messages')
    .select('*')
    .eq('concern_id', concernId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

export async function createConcernMessage(message: Database['public']['Tables']['concern_messages']['Insert']) {
  const { data, error } = await supabase
    .from('concern_messages')
    .insert(message)
    .select()
    .single()

  if (error) throw error
  return data
}

// Lost & Found
export async function getLostFoundItems() {
  const { data, error } = await supabase
    .from('lost_found_items')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getLostFoundItemById(id: string) {
  const { data, error } = await supabase
    .from('lost_found_items')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createLostFoundItem(item: Database['public']['Tables']['lost_found_items']['Insert']) {
  const { data, error } = await supabase
    .from('lost_found_items')
    .insert(item)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateLostFoundItem(id: string, item: Database['public']['Tables']['lost_found_items']['Update']) {
  const { data, error } = await supabase
    .from('lost_found_items')
    .update(item)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteLostFoundItem(id: string) {
  const { error } = await supabase
    .from('lost_found_items')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Notifications
export async function getNotificationsByUserId(userId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function createNotification(notification: Database['public']['Tables']['notifications']['Insert']) {
  const { data, error } = await supabase
    .from('notifications')
    .insert(notification)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateNotification(id: string, notification: Database['public']['Tables']['notifications']['Update']) {
  const { data, error } = await supabase
    .from('notifications')
    .update(notification)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Users
export async function getUserById(id: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function updateUser(id: string, user: Database['public']['Tables']['users']['Update']) {
  const { data, error } = await supabase
    .from('users')
    .update(user)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Reports & Analytics

/**
 * Tallies rows by a derived key, returning the `{ status, count }[]` shape the
 * report charts consume. Null/empty keys collapse to `"Unspecified"` so no
 * bucket silently disappears from the chart.
 */
function countBy<T>(rows: T[] | null, key: (row: T) => string | null | undefined) {
  const counts = new Map<string, number>()

  for (const row of rows ?? []) {
    const bucket = key(row) || 'Unspecified'
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1)
  }

  return [...counts.entries()]
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count)
}

/**
 * Counts concerns per status.
 *
 * `PostgrestFilterBuilder.group()` does not exist in supabase-js 2.117, so this
 * pulls the single column it needs and tallies it here rather than pretending a
 * server-side `GROUP BY` is available. Swap for a Postgres view + `.single()`
 * if the concern table ever grows past a few thousand rows.
 */
export async function getConcernsByStatus() {
  const { data, error } = await supabase.from('concerns').select('status')

  if (error) throw error

  return countBy(data, (row) => row.status as string)
}

export async function getEventsAttendance() {
  const { data, error } = await supabase
    .from('events')
    .select('title, capacity, event_registrations!inner(count)')
    .order('start_time', { ascending: false })

  if (error) throw error
  return data
}

/** @see getConcernsByStatus — same reason, no `.group()` in supabase-js 2.117. */
export async function getLostFoundResolutionRate() {
  const { data, error } = await supabase.from('lost_found_items').select('status')

  if (error) throw error

  return countBy(data, (row) => row.status as string)
}

// Seeded Campus IDs
export async function getSeededCampusIds() {
  const { data, error } = await supabase
    .from('seeded_campus_ids')
    .select('*')

  if (error) throw error
  return data
}

export async function claimCampusId(id: string, userId: string) {
  const { data, error } = await supabase
    .from('seeded_campus_ids')
    .update({ is_claimed: true, claimed_by: userId })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Storage
export async function uploadConcernAttachment(file: File): Promise<string> {
  const filename = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`
  const { data, error } = await supabase
    .storage
    .from('concern-attachments')
    .upload(filename, file)

  if (error) throw error

  // Get public URL
  const { data: urlData } = supabase
    .storage
    .from('concern-attachments')
    .getPublicUrl(filename)

  return urlData.publicUrl
}

// Helper to get users by roles
export async function getUsersByRoles(roles: string[]) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .in('role', roles)

  if (error) throw error
  return data
}

// Notification creation functions
export async function createAnnouncementNotification(announcementId: string, excludeUserId?: string) {
  try {
    // Fetch the announcement
    const { data: announcement, error: announcementError } = await supabase
      .from('announcements')
      .select('*, created_by')
      .eq('id', announcementId)
      .single()

    if (announcementError) throw announcementError
    if (!announcement) throw new Error('Announcement not found')

    // Only notify if published
    if (announcement.status !== 'published') return

    // Determine target roles based on audience
    let targetRoles: string[] = []
    switch (announcement.audience) {
      case 'Everyone':
        targetRoles = ['student', 'staff', 'admin']
        break
      case 'Students only':
        targetRoles = ['student']
        break
      case 'Personnel only':
        targetRoles = ['staff', 'admin']
        break
      default:
        targetRoles = ['student', 'staff', 'admin']
    }

    // Fetch users with target roles
    const users = await getUsersByRoles(targetRoles)

    // Create notification for each user (excluding the creator if specified)
    for (const user of users) {
      if (excludeUserId && user.id === excludeUserId) continue

      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          type: 'announcement',
          title: announcement.title,
          body: announcement.body.length > 100
            ? announcement.body.substring(0, 100) + '...'
            : announcement.body,
          related_id: announcement.id,
        })

      if (error) console.error(`Failed to create notification for user ${user.id}:`, error)
    }
  } catch (error) {
    console.error('Error in createAnnouncementNotification:', error)
  }
}

export async function createEventUpdateNotification(eventId: string, excludeUserId?: string) {
  try {
    // Fetch the event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (eventError) throw eventError
    if (!event) throw new Error('Event not found')

    // Fetch registered users for this event
    const { data: registrations, error: registrationsError } = await supabase
      .from('event_registrations')
      .select('student_id')
      .eq('event_id', eventId)

    if (registrationsError) throw registrationsError

    // Get user IDs from registrations
    const userIds = registrations.map((r: any) => r.student_id)

    // Fetch user details for these IDs
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .in('id', userIds)

    if (usersError) throw usersError

    // Create notification for each registered user (excluding the updater if specified)
    for (const user of users) {
      if (excludeUserId && user.id === excludeUserId) continue

      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          type: 'event',
          title: `Update: ${event.title}`,
          body: `The event "${event.title}" has been updated. Check for changes in time, location, or description.`,
          related_id: event.id,
        })

      if (error) console.error(`Failed to create notification for user ${user.id}:`, error)
    }
  } catch (error) {
    console.error('Error in createEventUpdateNotification:', error)
  }
}

export async function createConcernStatusNotification(concernId: string, excludeUserId?: string) {
  try {
    // Fetch the concern
    const { data: concern, error: concernError } = await supabase
      .from('concerns')
      .select('*, student_id')
      .eq('id', concernId)
      .single()

    if (concernError) throw concernError
    if (!concern) throw new Error('Concern not found')

    // Fetch the student who submitted the concern
    const { data: student, error: studentError } = await supabase
      .from('users')
      .select('*')
      .eq('id', concern.student_id)
      .single()

    if (studentError) throw studentError
    if (!student) throw new Error('Student not found')

    // Don't notify if the excluded user is the student (e.g., if student updated their own concern)
    if (excludeUserId && student.id === excludeUserId) return

    // Create notification for the student
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: student.id,
        type: 'concern',
        title: `Concern Status Updated: ${concern.subject}`,
        body: `Your concern "${concern.subject}" has been updated to "${concern.status}".`,
        related_id: concern.id,
      })

    if (error) console.error('Failed to create concern status notification:', error)
  } catch (error) {
    console.error('Error in createConcernStatusNotification:', error)
  }
}