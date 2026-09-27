# CampusConnect — Phase 1 Setup Guide

Follow these steps to set up Clerk and Supabase accounts and obtain the necessary API keys.

## Step 1: Create Clerk Account

1. Go to [https://clerk.com](https://clerk.com) and click "Sign Up" (use GitHub, Google, or email)
2. After signing in, click "Create Application"
3. Give your application a name (e.g., "CampusConnect")
4. Choose "Next.js" as your framework
5. Once created, go to the "API Keys" tab in your Clerk dashboard
6. You'll see:
   - **Publishable Key** (starts with `pk_test_` or `pk_live_`)
   - **Secret Key** (starts with `sk_test_` or `sk_live_`)

## Step 2: Create Supabase Account

1. Go to [https://supabase.com](https://supabase.com) and click "Sign Up" (use GitHub or email)
2. After signing in, click "New Project"
3. Fill in:
   - Project name: "campusconnect"
   - Database password: (choose a strong password - save this!)
   - Region: select closest to your location
4. Wait for the project to provision (takes ~1-2 minutes)
5. Once ready, go to "Settings" → "API" in your Supabase dashboard
6. You'll see:
   - **Project URL** (looks like `https://xxxyz.supabase.co`)
   - **anon public** key (starts with `eyJhbGciOi...`)
   - **service_role** key (starts with `eyJhbGciOi...` - **NOTE: This is for server-side only, never expose to client**)

## Step 3: Configure Environment Variables

1. In your project root (`C:\Users\henry\Desktop\CampusConnect\campusconnect`), create a file named `.env.local`
2. Add the following variables (replace the placeholder values with your actual keys):

```
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key_here
CLERK_SECRET_KEY=your_clerk_secret_key_here
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Step 4: Initialize shadcn/ui

Run the following command in your project directory:
```bash
npx shadcn@latest init
```

When prompted:
- Would you like to use TypeScript? **Yes**
- Which style would you like to use? **Default**
- Which color would you like to use as base color? **Slate**
- Where is your global CSS file? `src/app/globals.css`
- Do you want to use CSS variables for colors? **No**
- Where is your tailwind.config.js located? `tailwind.config.js`
- Configure the import alias for components: `@/*`
- Using `@/*` for import alias. ✔
- ✔ Writing `src/components.json`
- ✔ Initialized successfully.

## Step 5: Create Supabase Tables

1. In your Supabase dashboard, go to the SQL Editor
2. Create the following tables:

```sql
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
```

## Step 6: Insert Sample Campus IDs

In the SQL Editor, run:
```sql
INSERT INTO public.seeded_campus_ids (campus_id, is_claimed) VALUES
  ('CA4B7X9K2M1', false),
  ('CA7Q2W8E3R5', false),
  ('CA1N6T4Y7U9', false),
  ('CA9Z3X6C1V8', false),
  ('CA5M2K7L4P0', false)
ON CONFLICT (campus_id) DO NOTHING;
```

## Step 7: Set up Clerk Webhook (Optional but Recommended)

To automatically sync Clerk users to your Supabase `users` table:

1. In Clerk dashboard, go to "Webhooks"
2. Click "Create Webhook"
3. Set the endpoint to: `https://your-project.supabase.co/functions/v1/clerk-webhook` (we'll create this function later)
4. Select events: `user.created`, `user.updated`, `user.deleted`
5. Save the webhook

## Step 8: Install Supabase CLI (for local development)

```bash
npm install -g supabase
```

Then login:
```bash
supabase login
```

Link your local project:
```bash
supabase link --project-ref YOUR_PROJECT_REF
```
(You can find your project reference in Supabase Settings → API)

## Step 9: Start Development Server

```bash
npm run dev
```

Your app should now be running at http://localhost:3000

## Next Steps for Phase 1 Completion

After completing the above setup, you should:
1. Have a running Next.js app
2. Have Clerk authentication working (you can sign up/sign in)
3. Have Supabase connected
4. Have shadcn/ui initialized
5. Have the basic folder structure in place

You can then proceed to build the shared UI components and placeholder pages as outlined in the Phase 1 exit criteria.