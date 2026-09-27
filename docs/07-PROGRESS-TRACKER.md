# CampusConnect — Progress Tracker

Update the checkboxes as you complete each item. Organized by phase — see `09-PHASE-PLAN.md` for the full plan this maps to.

## Phase 0 — Setup (13 items)
- [x] Next.js project initialized
- [x] Tailwind CSS configured
- [x] Clerk installed and configured (sign-in/sign-up URLs, middleware)
- [ ] Google OAuth enabled in Clerk
- [ ] Supabase project created
- [ ] Supabase ↔ Clerk third-party auth connected
- [ ] `seeded_campus_ids` table created
- [ ] Sample Campus IDs seeded for dev/demo (see `02-ARCHITECTURE.md` §9)
- [ ] Campus ID field added to signup (validation: `^CA[A-Za-z0-9]{9}$` + existence/unclaimed check against seeded table)
- [ ] Campus ID login lookup implemented (Campus ID → email → Clerk auth)
- [x] Environment variables set (`.env.local`)
- [x] Folder structure scaffolded per `02-ARCHITECTURE.md`
- [x] Git repo initialized, `.gitignore` confirmed

*Note: bulk CSV import for Campus IDs is a stretch goal, not required for MVP — manual single-entry (or direct database seeding) is sufficient for now.*

## Phase 1 — Database & RLS (9 items)
- [ ] `users` table (synced from Clerk)
- [ ] `announcements` table + RLS policies
- [ ] `events` table + RLS policies
- [ ] `event_registrations` table + RLS policies
- [ ] `concerns` table + RLS policies
- [ ] `concern_messages` table + RLS policies
- [ ] `lost_found_items` table + RLS policies
- [ ] `notifications` table + RLS policies
- [ ] Supabase Storage buckets created (avatars, lost-found-photos, event-covers, announcement-images)

## Phase 2 — Frontend Screens (38 total)

### Guest (9)
- [x] Landing page
- [x] Login page
- [x] Signup page
- [x] Forgot Password page
- [x] Public Announcements list
- [x] Public Announcement detail
- [x] Public Events list
- [x] Public Event detail
- [x] Public Lost & Found (+ empty state)

### Student (14)
- [x] Dashboard
- [x] Announcements list
- [x] Announcement detail
- [x] Events list
- [x] Event detail
- [x] My Events
- [x] Submit a Concern
- [x] My Concerns
- [x] Concern detail (thread)
- [x] Report Lost/Found item
- [x] Lost & Found list
- [x] Lost & Found item detail
- [x] Profile
- [x] Notifications

### Personnel (4)
- [x] Personnel dashboard
- [x] All Concerns
- [x] Concern detail (staff view + status/response)
- [x] Lost & Found management

### Admin (9)
- [x] Admin dashboard (with charts)
- [x] Manage Announcements (+ create/edit modal)
- [x] Manage Events (+ create/edit modal)
- [x] Event Registrants
- [x] Manage Concerns (+ assign modal)
- [x] Manage Lost & Found
- [x] Manage Users (+ role-change modal)
- [x] Manage Campus IDs (+ single-entry add; bulk import is stretch goal)
- [x] Reports & Insights

### System (2)
- [x] 404 Page Not Found
- [x] Access Denied

*Note: all 38 screens are implemented on the App Router with deterministic mock data (Phase 3 wiring pending). Routes are grouped as `app/(public)`, `app/(app)` and `app/(auth)`; `/admin/*` is admin-only and `/staff/*` is personnel/admin in `proxy.ts`. `npx tsc --noEmit`, `npm run lint` and `npm run build` all pass.*

## Phase 3 — Backend Logic / Functionality (8 items)
- [ ] Auth: sign up, log in, log out, role assignment, protected routing (email/password, Google, Campus ID)
- [ ] Announcements: full CRUD, publish/draft toggle, category filter, search
- [ ] Events: full CRUD, registration with capacity enforcement, cancellation, registrant export
- [ ] Concerns: submission with attachment, threaded replies, status updates, assignment to personnel
- [ ] Lost & Found: report with photo upload, status updates (open/claimed), search/filter by type
- [ ] Notifications: triggers on announcement/event/concern events, mark as read, realtime badge update
- [ ] User management: role changes, deactivation, Campus ID seeding
- [ ] Reports: aggregated queries for charts (concerns by status, events by attendance, lost & found resolution rate), CSV/PDF export

## Phase 4 — Testing (5 items)
- [ ] Functional testing complete (see `05-TESTING-REPORT.md`)
- [ ] Usability pass complete
- [ ] Security testing complete (RLS verification, role tampering attempts)
- [ ] Cross-device responsive testing complete
- [ ] All critical/high bugs resolved

## Phase 5 — Deployment (6 items)
- [ ] Domain purchased and connected (campusconnectph.site)
- [ ] Deployed to Vercel
- [ ] SSL confirmed active
- [ ] Production environment variables set
- [ ] Final smoke test on production URL
- [ ] Demo rehearsed using `04-DEMO-GUIDE.md`

## Overall Completion
| Phase | Total Items | Completed | % |
|---|---|---|---|
| Setup | 13 | 7 | 54% |
| Database & RLS | 9 | 0 | 0% |
| Frontend Screens | 38 | 38 | 100% |
| Backend Logic | 8 | 0 | 0% |
| Testing | 5 | 0 | 0% |
| Deployment | 6 | 0 | 0% |

Update the "Completed" and "%" columns as you go — a quick weekly gut-check on where you stand against the 38-screen target.
