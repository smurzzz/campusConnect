# CampusConnect — Progress Tracker

Update the checkboxes as you complete each item. Organized by phase — see `09-PHASE-PLAN.md` for the full plan this maps to.

## Phase 0 — Setup (13 items)
- [ ] Next.js project initialized
- [ ] Tailwind CSS configured
- [ ] Clerk installed and configured (sign-in/sign-up URLs, middleware)
- [ ] Google OAuth enabled in Clerk
- [ ] Supabase project created
- [ ] Supabase ↔ Clerk third-party auth connected
- [ ] `seeded_campus_ids` table created
- [ ] Sample Campus IDs seeded for dev/demo (see `02-ARCHITECTURE.md` §9)
- [ ] Campus ID field added to signup (validation: `^CA[A-Za-z0-9]{9}$` + existence/unclaimed check against seeded table)
- [ ] Campus ID login lookup implemented (Campus ID → email → Clerk auth)
- [ ] Environment variables set (`.env.local`)
- [ ] Folder structure scaffolded per `02-ARCHITECTURE.md`
- [ ] Git repo initialized, `.gitignore` confirmed

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
- [ ] Landing page
- [ ] Login page
- [ ] Signup page
- [ ] Forgot Password page
- [ ] Public Announcements list
- [ ] Public Announcement detail
- [ ] Public Events list
- [ ] Public Event detail
- [ ] Public Lost & Found (+ empty state)

### Student (14)
- [ ] Dashboard
- [ ] Announcements list
- [ ] Announcement detail
- [ ] Events list
- [ ] Event detail
- [ ] My Events
- [ ] Submit a Concern
- [ ] My Concerns
- [ ] Concern detail (thread)
- [ ] Report Lost/Found item
- [ ] Lost & Found list
- [ ] Lost & Found item detail
- [ ] Profile
- [ ] Notifications

### Personnel (4)
- [ ] Personnel dashboard
- [ ] All Concerns
- [ ] Concern detail (staff view + status/response)
- [ ] Lost & Found management

### Admin (9)
- [ ] Admin dashboard (with charts)
- [ ] Manage Announcements (+ create/edit modal)
- [ ] Manage Events (+ create/edit modal)
- [ ] Event Registrants
- [ ] Manage Concerns (+ assign modal)
- [ ] Manage Lost & Found
- [ ] Manage Users (+ role-change modal)
- [ ] Manage Campus IDs (+ single-entry add; bulk import is stretch goal)
- [ ] Reports & Insights

### System (2)
- [ ] 404 Page Not Found
- [ ] Access Denied

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
| Setup | 13 | 0 | 0% |
| Database & RLS | 9 | 0 | 0% |
| Frontend Screens | 38 | 0 | 0% |
| Backend Logic | 8 | 0 | 0% |
| Testing | 5 | 0 | 0% |
| Deployment | 6 | 0 | 0% |

Update the "Completed" and "%" columns as you go — a quick weekly gut-check on where you stand against the 38-screen target.
