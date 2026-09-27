-- Users table (will be auto-populated by Clerk webhook, but we define it for RLS)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    full_name TEXT,
    email TEXT,
    campus_id TEXT UNIQUE,
    role TEXT DEFAULT 'student',
    avatar_url TEXT,
    contact_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seeded Campus IDs table
CREATE TABLE IF NOT EXISTS public.seeded_campus_ids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campus_id TEXT UNIQUE NOT NULL,
    is_claimed BOOLEAN DEFAULT FALSE,
    claimed_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Announcements table
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category TEXT,
    body TEXT NOT NULL,
    status TEXT DEFAULT 'draft', -- draft/published
    audience TEXT, -- e.g., 'all', 'student', 'personnel', 'admin'
    image_url TEXT,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Events table
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    location TEXT,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    capacity INTEGER,
    cover_image_url TEXT,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Event registrations table
CREATE TABLE IF NOT EXISTS public.event_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.users(id),
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'registered' -- registered, cancelled, attended
);

-- Concerns table
CREATE TABLE IF NOT EXISTS public.concerns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject TEXT NOT NULL,
    category TEXT,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, in_progress, resolved, closed
    student_id UUID REFERENCES public.users(id),
    assigned_to UUID REFERENCES public.users(id),
    attachment_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Concern messages table (for threaded replies)
CREATE TABLE IF NOT EXISTS public.concern_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    concern_id UUID REFERENCES public.concerns(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.users(id),
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lost & Found items table
CREATE TABLE IF NOT EXISTS public.lost_found_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('lost', 'found')),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    location TEXT,
    date DATE,
    photo_url TEXT,
    status TEXT DEFAULT 'reported', -- reported, claimed
    reported_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id),
    type TEXT, -- announcement, concern_update, event_reminder, etc.
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    related_id UUID, -- references announcement_id, concern_id, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seeded_campus_ids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concerns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concern_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lost_found_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;