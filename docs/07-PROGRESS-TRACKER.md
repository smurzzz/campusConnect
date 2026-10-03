# CampusConnect — Progress Tracker

Update the checkboxes as you complete each item. Organized by phase — see `09-PHASE-PLAN.md` for the full plan this maps to.

## Phase 0 — Setup (13 items)
- [x] Next.js project initialized
- [x] Tailwind CSS configured
- [x] Clerk installed and configured (sign-in/sign-up URLs, middleware)
- [ ] Google OAuth enabled in Clerk — *code side is ready (`/sso-callback` + `signUp.sso({ strategy: 'oauth_google' })` from the custom auth screens); the one remaining step is in the Clerk Dashboard: SSO Connections → Google → enable, with `http://localhost:3000/sso-callback` as the redirect target. Dashboard access is required, so this cannot be completed from code.*
- [ ] Supabase project created — *live project `tpybvducrovzcxskorse` (Mumbai) is linked and all migrations applied; checkbox left for the original creator to confirm provisioning history*
- [x] Supabase ↔ Clerk third-party auth connected — *live 2026-09-30, proven by `node scripts/test-rls-jwt.mjs`: 8/8 checks (real Clerk session token → Supabase REST reads/RLS-writes/forgery-rejection). Wiring: Supabase Dashboard Third-Party Auth → Clerk (`outgoing-pony-4357.clerk.accounts.dev`); Clerk session-token template carries `role: "authenticated"` (Supabase's required Postgres role) plus `"metadata": {{user.public_metadata}}` (surfaces the app role as `metadata.role`). Two supporting migrations: `20260930120000` fixes `lost_found_items_update_student` (raw `role` claim was never 'student' → dead policy) and `20260930121000` inverts `jwt_role()` precedence so `metadata.role` wins over the always-`authenticated` top-level claim. Webhook defaults `publicMetadata.role='student'` + `users.role='student'` for new accounts; `scripts/backfill-user-roles.mjs` handles legacy users (ran: 0 needed).*
- [x] `seeded_campus_ids` table created — *created in `20260927100000_create_tables.sql`, converted to Clerk-id `claimed_by TEXT` in `20260928030000`, claim-your-own UPDATE policy live*
- [x] Sample Campus IDs seeded for dev/demo (see `02-ARCHITECTURE.md` §9) — *seeded 2026-09-29 via `supabase db query --linked`: the five doc `CA…` IDs plus five `CA2024000x` student numbers matching the app's live `^CA\d{1,8}$` pattern (the doc's `CA+9` pattern was superseded; the live IDs were briefly `NU-` then `CA-` prefixed and settled on the no-dash `CA` student-number format before deploy — the legacy `CA+9` rows remain as unclaimed entries)*
- [x] Campus ID field added to signup (validation: `^CA[A-Za-z0-9]{9}$` + existence/unclaimed check against seeded table) — *implemented in the real Clerk sign-up (`app/(auth)/auth-client.tsx`) with the live `^CA\d{1,8}$` pattern from `lib/validators`; the claim itself is a race-safe conditional UPDATE through `POST /api/campus-ids/claim` (RLS `seeded_campus_ids_update_claim` is the enforcement layer; unknown IDs are rejected 404, already-claimed 409)*
- [x] Campus ID login lookup implemented (Campus ID → email → Clerk auth) — *`POST /api/campus-ids/lookup` resolves a claimed ID to its account email (uniform 404 so the endpoint cannot enumerate accounts), then the custom sign-in authenticates through Clerk with the resolved identifier*
- [x] Environment variables set (`.env.local`)
- [x] Folder structure scaffolded per `02-ARCHITECTURE.md`
- [x] Git repo initialized, `.gitignore` confirmed

*Note: bulk CSV import for Campus IDs is a stretch goal, not required for MVP — manual single-entry (or direct database seeding) is sufficient for now.*

## Phase 1 — Database & RLS (9 items)
- [x] `users` table (synced from Clerk) — *the table was `id UUID REFERENCES auth.users(id)`, but auth is Clerk, whose ids are opaque strings, so no row could ever be created. `20260928030000_migrate_users_id_to_clerk_text.sql` converted `users.id` and all eight foreign keys pointing at it to `TEXT` and rewrote the RLS policies to compare against `(auth.jwt() ->> 'sub')`. Applied and verified against the live project 2026-09-28: every converted column accepts a Clerk-style id, and RLS policies must be dropped before the type change or Postgres rejects the ALTER.*
- [x] `announcements` table + RLS policies — *applied and verified against the live project 2026-09-28: drafts are hidden from the anon key, anon writes are refused, and the status/audience CHECKs reject bad values*
- [x] `events` table + RLS policies — *policies rebuilt in `20260928050000`: owner update/delete via `(auth.jwt() ->> 'sub')`, admin-only insert with the new `public.jwt_role()` helper*
- [x] `event_registrations` table + RLS policies — *own-rows only; `(event_id, student_id)` unique + `event_capacity_trigger` enforce capacity server-side*
- [x] `concerns` table + RLS policies — *student-own/staff-all split now matches the `personnel` role vocabulary*
- [x] `concern_messages` table + RLS policies — *participants + staff/admin*
- [x] `lost_found_items` table + RLS policies — *public select, owner/staff update*
- [x] `notifications` table + RLS policies — *own-rows select against the Clerk `sub` claim*
- [x] Supabase Storage buckets created (avatars, lost-found-photos, event-covers, announcement-images) — *`concern-attachments` and `lost-found-attachments` created live and in `20260928050000` with owner-folder write policies and public read; avatars/event-covers/announcement-images are URL-based for now*

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

*Note: all 38 screens are implemented on the App Router. Routes are grouped as `app/(public)`, `app/(app)` and `app/(auth)`; `/admin/*` is admin-only and `/staff/*` is personnel/admin in `proxy.ts`. Every module (announcements, events, concerns, lost & found, notifications, users, reports) now reads and writes Supabase through the session-bound client (see Phase 3); the old `lib/mock/*` legacy data and the superseded `src/middleware.ts` were deleted during pre-Phase-4 housekeeping.*

*Build status (2026-10-02): `npx tsc --noEmit`, `npm run build`, and `npm run lint` all pass — **0 lint problems**. The pre-existing `react-hooks` React Compiler violations (`set-state-in-effect`, `immutability`, `purity`, `rules-of-hooks` in `auth-client.tsx`), unused vars, and dead code were all fixed rather than suppressed.*

*Page structure: any page that needs browser state is split into a server `page.tsx` (which owns `export const metadata`) and a colocated `*-client.tsx` with `"use client"`. `metadata` cannot be exported from a client module, and a server module cannot import `useState`/`useEffect`, so neither can live in one file.*

## Phase 3 — Backend Logic / Functionality (8 items)
- [x] Auth: sign up, log in, log out, role assignment, protected routing (email/password, Google, Campus ID) — *the Clerk webhook only handled `user.updated` and `user.deleted`, with no `user.created` branch, so `public.users` was never populated. It now upserts on both events through a service-role client, which is required because `public.users` has no INSERT or DELETE policy. (Google sign-in additionally requires the Clerk Dashboard toggle tracked under Phase 0.)*
- [x] Announcements: full CRUD, publish/draft toggle, category filter, search — *verified live 2026-09-28*
- [x] Events: full CRUD, registration with capacity enforcement, cancellation, registrant export — *`lib/events.ts` + `use-events.ts`; registration is session-bound with the capacity trigger as the real enforcement; admin manager (`components/events/event-manager.tsx`) covers create/edit/delete; registrants page exports CSV*
- [x] Concerns: submission with attachment, threaded replies, status updates, assignment to personnel — *uploads to `concern-attachments` under `<clerk-id>/`; staff detail page updates status (trigger notifies the student) and assigns from a real personnel directory*
- [x] Lost & Found: report with photo upload, status updates (open/claimed), search/filter by type — *uploads to `lost-found-attachments`; staff and admin lists filter/search; claim fires the lost-found trigger*
- [x] Notifications: triggers on announcement/event/concern events, mark as read, realtime badge update — *all five trigger functions were inserting into `notifications.title`/`.body`, which do not exist; fixed in `20260928020000_fix_notification_trigger_columns.sql` (the live column is `message`). The publish trigger also compared `uuid <> text` across `users.id`/`announcements.created_by`, fixed in `20260928010000`. The announcement path verified end-to-end 2026-09-28: publishing notified every non-author user with a populated `message`, and a draft produced no notification. `use-notifications.ts` rewritten on the token-bound client with realtime INSERT/UPDATE channels for the live bell badge*
- [x] User management: role changes, deactivation, Campus ID seeding — *role route updates Clerk `publicMetadata` and mirrors into `public.users`; status route bans/unbans the Clerk user so deactivation blocks sign-in and revokes sessions (self-deactivation refused); the `public.users.status` column was added in `20260928040000_add_users_status.sql`*
- [x] Reports: aggregated queries for charts (concerns by status, events by attendance, lost & found resolution rate), CSV/PDF export — *live aggregates in `admin-reports-page-client.tsx` with CSV export; PDF export added 2026-10-02 (jsPDF + jspdf-autotable, dynamically imported on the reports page so it stays out of the main bundle), both formats share the same aggregate rows via the Export dropdown on the reports shell*

## Phase 4 — Testing (5 items)
- [x] Functional testing complete (see `05-TESTING-REPORT.md`) — *§1 fully populated: auth, announcements, events, concerns, lost & found, notifications, user management — all rows Pass (Google OAuth remains configuration-blocked in the Clerk Dashboard, tracked under Phase 0/5). Includes the empty/loading/error-state audit and the light accessibility pass.*
- [x] Usability pass complete — *§2 ratings 5/5/5/4/5 plus demo-readiness notes (seed spot-check + `04-DEMO-GUIDE.md` dry run, both Pass; admin CSV/PDF export click-verified)*
- [x] Security testing complete (RLS verification, role tampering attempts) — *§3: `test-rls-jwt.mjs` 8/8, `test-role-tampering.mjs` 20/20, injection/upload/session-expiry all Pass; bugs #7/#9/#10/#11 fixed via migrations and re-verified*
- [x] Cross-device responsive testing complete — *375 / 768 / 1280 sweep: zero horizontal scroll and zero overflowing elements on every checked route (recorded in the report's Responsive QA table)*
- [x] All critical/high bugs resolved — *bug log §5: 11/11 fixed and re-verified; lint 0 problems, `tsc --noEmit` 0 errors, production build green. Lighthouse (prod, desktop): Landing perf 98 / Ann 94, a11y 100, CLS 0 — raw JSON in `docs/evidence/lighthouse/`*

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
| Setup | 13 | 11 | 85% |
| Database & RLS | 9 | 9 | 100% |
| Frontend Screens | 38 | 38 | 100% |
| Backend Logic | 8 | 8 | 100% |
| Testing | 5 | 5 | 100% |
| Deployment | 6 | 0 | 0% |

Update the "Completed" and "%" columns as you go — a quick weekly gut-check on where you stand against the 38-screen target.
