import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
          created_by: string
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
          created_by?: string
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
          avatar_url?: string | null
          contact_number?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "auth.users"
            referencedColumns: ["id"]
          }
        ]
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