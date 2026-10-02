# CampusConnect — Phase Plan

A build-order plan structured so you always have something working, rather than half-finished pieces across every module at once.

---

## Phase 1 — Installation & Setup
**Goal:** a running project with auth, database, and design system wired together, before writing a single feature.

1. Scaffold the Next.js project (TypeScript, Tailwind, App Router).
2. Install and configure Clerk — set up sign-in/sign-up pages, middleware for route protection, Google OAuth, and a default `role: student` on new signups via `publicMetadata`.
3. Create the Supabase project — set up the database, connect it to Clerk via Supabase's third-party auth integration so RLS can read the Clerk JWT's role claim. Create the `seeded_campus_ids` table and insert the sample IDs from `02-ARCHITECTURE.md` §9 so the Campus ID signup/login flow has something real to validate against from day one.
4. Set up `shadcn/ui` and confirm Tailwind theme tokens (colors, radii) match the design system from your mockups.
5. Scaffold the folder structure (see `02-ARCHITECTURE.md`).
6. Set up environment variables and confirm `.env.local` is git-ignored.
7. Build the shared UI primitives first, since every screen depends on them: Button, Input, Select/Dropdown, Modal, Badge, Table, Card, Sidebar, Navbar, Toast, Skeleton loader, Empty state component.
8. Confirm: a logged-out user can view a placeholder landing page, sign up, log in, and land on a placeholder dashboard — before building any real feature.

**Exit criteria:** auth works end-to-end, shared components exist, folder structure is in place.

---

## Phase 2 — Frontend (UI) Build
**Goal:** every one of the 38 screens exists and renders correctly with realistic mock or seeded data, before wiring real backend logic everywhere.

Build in this order — each step reuses patterns from the previous one, which is why announcements come first (simplest CRUD shape):

1. **Guest shell:** Landing, Login, Signup, Forgot Password — get the auth-adjacent pages done first since nothing else works without them.
2. **Announcements (full loop):** Public list → Public detail → Student list → Student detail → Admin Manage Announcements + create/edit modal. This proves your full CRUD + guest/student/admin pattern once.
3. **Events:** Public list/detail → Student list/detail/My Events → Admin Manage Events + create modal + Registrants page.
4. **Concerns:** Submit form → My Concerns → Concern detail (student) → Personnel dashboard/All Concerns/Concern detail (staff) → Admin Manage Concerns + assign modal.
5. **Lost & Found:** Public list → Report form → Student list/detail → Personnel management → Admin management.
6. **Notifications & Profile:** Notifications inbox, Profile page.
7. **Dashboards:** Student Dashboard, Personnel Dashboard, Admin Dashboard (build these after their underlying modules exist, since dashboards just aggregate/link to them).
8. **Admin extras:** Manage Users + role modal, Reports & Insights.
9. **System states:** 404, Access Denied, and confirm every list has a working empty state.

At this stage, screens can use static/seeded data if backend logic (Phase 3) isn't wired yet for a given module — the point of this phase is layout, responsiveness, and interaction wiring (buttons, modals, search inputs functioning visually), not full correctness yet.

**Exit criteria:** all 38 screens exist, are responsive, and every button/modal/search bar in `08-FUNCTIONALITY-PROMPT.md` is wired to *something* (even if it's still touching mock data).

---

## Phase 3 — Backend (Real Data & Logic)
**Goal:** every screen from Phase 2 is now backed by real Supabase data with correct RLS, replacing any mock data.

1. Create all Supabase tables and RLS policies (see `02-ARCHITECTURE.md` §4).
2. Wire Announcements CRUD to Supabase — confirm publish/draft toggle, category filter, and search all query real data. **Done and verified live** (`lib/announcements.ts`, `lib/hooks/use-announcements.ts`, `components/announcements/*`, and the three announcement routes). Two trigger bugs found and fixed along the way: `uuid <> text` on publish, and notification inserts targeting non-existent columns.
3. Wire Events CRUD + registration logic — including capacity enforcement (block registration once full) and registrant export. **Done** (`lib/events.ts`, `lib/hooks/use-events.ts`, `components/events/event-manager.tsx`, and the event routes). Registration identity comes from the session; capacity is enforced by a `BEFORE INSERT` trigger (`20260928050000`) so two concurrent requests cannot overbook, plus a `(event_id, student_id)` unique constraint. Registrants page exports CSV.
4. Wire Concerns — submission with file upload to Supabase Storage, threaded replies, status updates, and assignment logic. **Done** (`lib/concerns.ts` + all six concern routes on the token-bound client). Uploads go to the new `concern-attachments` bucket under `<clerk-id>/`; assignment pulls the personnel directory from `users`; status changes fire the concern notification trigger.
5. Wire Lost & Found — submission with photo upload, status updates. **Done** (`lib/lost-found.ts` + rewritten submit/staff/admin/public pages). Photos upload to the new `lost-found-attachments` bucket; claiming fires the lost-found trigger; the public detail page is no longer hardcoded.
6. Wire Notifications — set up Postgres triggers (or app-level inserts) for new announcements, event updates, and concern status changes; connect Supabase Realtime so the notification bell updates live. **Done.** The announcement path was already verified live; the trigger bugs were fixed in `20260928010000`/`20260928020000`. The event, concern, and lost-and-found triggers share the same corrected column set and run against the live schema now that `users` can be populated. `use-notifications.ts` was rewritten on the token-bound client (the anon client could never read own-rows under `notifications_select_own`) with realtime INSERT/UPDATE channels driving the bell badge.
7. Wire User Management — role changes update both Clerk `publicMetadata` and the Supabase `users` table; deactivation blocks login. **Done.** The role route updates Clerk metadata and mirrors the role into `public.users` via the service-role client (207 on partial failure). The status route now **bans** the Clerk user (`users.banUser`), which blocks sign-in and revokes sessions — the soft flag alone did not — and self-deactivation is refused. Both routes remain admin-checked from the session token.
8. Wire Reports — build the aggregate queries backing each chart (concerns by status, events by attendance, lost & found resolution rate) and the CSV/PDF export. **Done.** `admin-reports-page-client.tsx` pulls live counts through the authed client and exports all three aggregates as CSV *or* PDF (jsPDF, added 2026-10-02) from the same row builder; the shared `AdminDashboard` shell renders the real buckets in its charts.
9. Replace every remaining hardcoded/mock value with a real query, per `03-CODE-STANDARDS.md`.

> **Blocking issue for steps 3-5 — resolved 2026-09-28.** The sessionless anon
> client has been replaced everywhere it mattered: `useSupabaseClient()` now
> lives in `lib/hooks/use-supabase-client.ts` and is used by every module's
> pages, hooks, and shared shells. Only the landing page still uses the anon
> client, for a published-only public read. RLS vocabulary was also fixed in
> `20260928050000`: personnel policies now accept `personnel` (the app's role)
> alongside legacy `staff`, admins gained `users_select_admin`, and event
> creation is admin-only. Storage buckets `concern-attachments` and
> `lost-found-attachments` exist with owner-folder policies.

**Exit criteria:** no screen uses mock data; every action (submit, register, assign, publish, delete) persists correctly and respects role-based access at the database level.

---

## Phase 4 — What's Needed After (Testing, Polish, Deployment)

1. **Functional & security testing** — work through `05-TESTING-REPORT.md` in full, including RLS bypass attempts and role-tampering checks.
2. **Responsive QA** — test every screen at mobile, tablet, and desktop widths; fix any layout breakage.
3. **Performance pass** — run Lighthouse on key pages (Landing, Dashboard, Announcements list), fix any major score issues (unoptimized images, layout shift, unnecessary client components).
4. **Empty/loading/error state audit** — click through every list and form with no data, slow network (throttle in dev tools), and a forced error, confirming nothing breaks or shows a blank screen.
5. **Accessibility pass (light)** — confirm form fields have labels, buttons have accessible text, color contrast is reasonable.
6. **Domain & deployment** — connect the domain, deploy to Vercel, confirm SSL is active, set production environment variables separately from local dev ones.
7. **Seed realistic demo data** — so the live deployed version looks populated and real for your presentation, not empty.
8. **Rehearse the demo** using `04-DEMO-GUIDE.md`.
9. **Final proposal document update** — make sure your written proposal's Technology Stack, Timeline, and Screens sections match what was actually built.

**Exit criteria:** system is live, tested, documented, and demo-ready.

---

## Summary Timeline Mapping
| Phase | What | Roughly maps to proposal's... |
|---|---|---|
| 1 — Installation | Setup, auth, shared components | "System Design" |
| 2 — Frontend | All 38 screens, UI wiring | "Development" (frontend half) |
| 3 — Backend | Real data, RLS, notifications, reports | "Development" (backend half) |
| 4 — After | Testing, polish, deployment, demo prep | "Testing and QA" + "Deployment" + "Project Presentation" |

Use this alongside `07-PROGRESS-TRACKER.md` to check off items as each phase progresses — that file mirrors this exact structure so you can track completion percentage per phase.
