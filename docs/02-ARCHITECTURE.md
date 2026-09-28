# CampusConnect — Architecture

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Client (Browser)                     │
│           Next.js App Router + Tailwind CSS               │
└───────────────┬─────────────────────────┬────────────────┘
                │                          │
        ┌───────▼────────┐        ┌───────▼────────┐
        │  Clerk (Auth)   │        │  Next.js API /  │
        │  Sessions, JWT  │        │ Server Actions   │
        └───────┬────────┘        └───────┬────────┘
                │  JWT w/ role claim       │
                └───────────┬──────────────┘
                            │
                  ┌─────────▼──────────┐
                  │      Supabase       │
                  │  Postgres + RLS     │
                  │  Storage (images)   │
                  │  Realtime (opt.)    │
                  └─────────────────────┘
```

## 2. Folder Structure (Next.js App Router)

```
/app
  /(guest)
    page.tsx                       → Landing
    /announcements
      page.tsx                     → Public announcements list
      /[id]/page.tsx                → Public announcement detail
    /events
      page.tsx
      /[id]/page.tsx
    /lost-found
      page.tsx
  /(auth)
    /login/page.tsx
    /signup/page.tsx
    /forgot-password/page.tsx
  /(student)
    /dashboard/page.tsx
    /announcements/...
    /events/...
    /concerns/...
    /lost-found/...
    /notifications/page.tsx
    /profile/page.tsx
  /(staff)
    /staff/dashboard/page.tsx
    /staff/concerns/...
    /staff/lost-found/page.tsx
  /(admin)
    /admin/dashboard/page.tsx
    /admin/announcements/...
    /admin/events/...
    /admin/concerns/...
    /admin/lost-found/page.tsx
    /admin/users/page.tsx
    /admin/campus-ids/page.tsx      → Manage seeded Campus IDs
    /admin/reports/page.tsx
  /not-found.tsx                    → 404
  /access-denied/page.tsx
/components
  /ui                               → shared primitives (Button, Badge, Input, Modal, Table...)
  /layout                           → Sidebar, Navbar, PageHeader
  /features                         → feature-specific composed components
/lib
  /supabase                         → client init, typed queries
  /clerk                            → auth helpers, role resolution
  /validators                       → Zod schemas
  /constants                        → enums, route maps, config (NOT hardcoded inline)
/middleware.ts                      → route protection by role
/types                              → shared TypeScript types
```

## 3. Role-Based Access Enforcement (Two Layers)

**Layer 1 — Middleware (Next.js):**
`middleware.ts` reads the Clerk session, checks `publicMetadata.role`, and redirects unauthorized route access to `/access-denied` before the page even renders.

**Layer 2 — Row Level Security (Supabase/Postgres):**
Every table has RLS policies that check the role claim embedded in the Clerk-issued JWT (passed through to Supabase via the third-party auth integration). This is the layer that actually protects data — middleware alone is not sufficient, since API routes and direct DB calls must also be protected.

Example policy pattern (concerns table):
```sql
-- Students can only see their own concerns
create policy "students_view_own_concerns"
on concerns for select
using (auth.jwt() ->> 'role' = 'student' and student_id = auth.uid());

-- Personnel/Admin can see all concerns
create policy "staff_view_all_concerns"
on concerns for select
using (auth.jwt() ->> 'role' in ('personnel', 'admin'));
```

## 4. Campus ID Login (Secondary Identifier)

In addition to email/password and Google OAuth, students can log in using a **Campus ID** — a school-issued identifier in the format `CA` + 9 alphanumeric characters (e.g. `CA4B7X9K2M1`), validated against the pattern `^CA[A-Za-z0-9]{9}$`.

- **Not a third-party OAuth provider.** It's a first-party alternate identifier mapped to the same Clerk account, similar to logging in with a username instead of an email.
- **Pre-seeded, not self-entered.** Valid Campus IDs are loaded into the database ahead of time (by an admin, via manual entry or eventually CSV import) — a student cannot simply type any correctly-formatted ID and get an account. Signup checks the entered ID against this seeded list and rejects anything not on it.
- **Storage.** A dedicated `seeded_campus_ids` table holds every valid ID and its claim status. The `users` table stores `campus_id` once claimed, kept unique via a database constraint, and it's mirrored into Clerk's `publicMetadata.campusId` for quick lookup during login.
- **Signup.** Campus ID is required, validated client-side (regex) and server-side (regex + existence-and-unclaimed check against `seeded_campus_ids`) before account creation. On success, the matching seeded row is marked `is_claimed = true` and linked to the new `user_id`.
- **Login.** The "Campus ID" button on the login screen swaps the identifier input from "Email" to "Campus ID," keeping the same password field and submit flow. Internally, the app resolves the account's email from the entered Campus ID, then authenticates through Clerk as normal.

## 5. Data Model (Core Tables)

| Table | Key Fields |
|---|---|
| `users` (synced from Clerk) | id, full_name, email, campus_id, role, avatar_url, contact_number |
| `seeded_campus_ids` | campus_id (unique), is_claimed, claimed_by (user_id, nullable), created_at |
| `announcements` | id, title, category, body, status (draft/published), audience, image_url, created_by, created_at |
| `events` | id, title, description, category, location, start_time, end_time, capacity, cover_image_url, created_by |
| `event_registrations` | id, event_id, student_id, registered_at, status |
| `concerns` | id, subject, category, description, status, student_id, assigned_to, attachment_url, created_at |
| `concern_messages` | id, concern_id, sender_id, message, created_at |
| `lost_found_items` | id, type (lost/found), name, description, category, location, date, photo_url, status, reported_by |
| `notifications` | id, user_id, type, message, read, related_id, created_at |

## 6. Request Flow Example — Submitting a Concern
1. Student fills out `/concerns/new` (React Hook Form + Zod validation, client-side).
2. On submit, a Server Action inserts into Supabase using the authenticated user's Clerk-derived `student_id`.
3. Postgres RLS confirms the insert matches `auth.uid()`.
4. On success, a `notifications` row is created (trigger or app-level call) for relevant personnel.
5. UI updates optimistically, then confirms via the Supabase response; a toast confirms submission.

## 6a. Announcements (the reference CRUD implementation)

Announcements are the first module wired to real data, and set the pattern the rest of the
app should follow.

**Layers**
| File | Responsibility |
|---|---|
| `lib/announcements.ts` | All queries and mutations. Exact column lists, no `select('*')`. Returns both data and a human-readable error string. |
| `lib/hooks/use-announcements.ts` | Binds a Supabase client to the Clerk session token and exposes `useAnnouncements` / `useAnnouncement` / `useAnnouncementMutations`. |
| `components/announcements/*` | Presentational list, detail view, and the admin manager (create/edit/delete/publish). |
| `app/(public)/announcements/**` | Guest + student surface. `page.tsx` is a server component; `announcement-list.tsx` is the client boundary. |
| `app/(app)/admin/announcements/page.tsx` | Admin surface, rendered behind the `useRole()` check. |

**Rules that matter here**
- **Failing closed.** `listAnnouncements` treats an absent `publishedOnly: false` as `published`. Drafts can only be reached by explicitly opting in, and that opt-in is additionally gated on the role being `admin`.
- **The session token is the authority.** Reads and writes go through `createAuthedSupabaseClient(getToken)`, so RLS evaluates the real Clerk JWT. The client-side role check is UX only; the database is what enforces access.
- **Authorship is not a form field.** `created_by` is written from `user.id` and RLS asserts `created_by = auth.jwt() ->> 'sub'`, so an edit cannot reassign authorship. The column is `TEXT` (Clerk ids like `user_2abc...`), not the `UUID` used by `public.users.id`.
- **Vocabulary is locked in the database.** `status` is `published`/`draft` and `audience` is `Everyone`/`Students only`/`Personnel only`, enforced by CHECK constraints that mirror `lib/constants/categories.ts` and `lib/constants/statuses.ts`. Update both together.
- **Search is escaped.** ILIKE metacharacters (`%`, `_`, `\`) are escaped before the term reaches PostgREST, so searching `100%` doesn't match everything.

## 7. Notifications Flow
- **In-app:** a Postgres trigger inserts into `notifications` on relevant events (new announcement, concern status change, event reminder). A Supabase Realtime subscription updates the bell icon/badge live, with no page refresh.
- **Email (optional/stretch):** a Next.js API route calls Resend when a notification of type `email_worthy` is created.

## 8. Environment & Config Strategy (No Hardcoding)
All environment-specific and configurable values live in `.env.local` (never committed) and are typed via a `lib/env.ts` validator (Zod), never scattered as string literals:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
RESEND_API_KEY=
```
Non-secret but still-configurable values (categories, statuses, roles, page sizes) live in `/lib/constants/` as typed enums/objects — never inline strings duplicated across components.

## 9. Sample Seed Data — Campus IDs

For development and demo purposes, seed `seeded_campus_ids` with a handful of sample IDs before testing signup. Bulk CSV import is a stretch goal, not required for MVP — insert these manually via the Supabase table editor or a one-time SQL script:

```sql
insert into seeded_campus_ids (campus_id, is_claimed) values
  ('CA4B7X9K2M1', false),
  ('CA7Q2W8E3R5', false),
  ('CA1N6T4Y7U9', false),
  ('CA9Z3X6C1V8', false),
  ('CA5M2K7L4P0', false);
```

Use one of these values when testing or demoing the signup flow. Once claimed, `is_claimed` flips to `true` and that ID can't be reused.

## 10. Performance Considerations
- Server Components by default; Client Components only where interactivity is required (forms, modals, dropdowns).
- Data fetching co-located with the route via Server Components — avoids client-side waterfalls.
- Supabase queries select only needed columns, paginated (limit/offset or cursor) — never `select *` on list views.
- Images served through Next.js `<Image>` with Supabase Storage URLs for automatic optimization.
- Skeleton loading states for all list/table views to avoid layout shift.
