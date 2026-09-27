# CampusConnect — Full Functionality Prompt (All 38 Screens)

This document specifies exact functionality for every screen — every button, search bar, form, and interactive element — so it can be handed to an AI coding assistant (or a developer) to implement screen-by-screen with no ambiguity. Pair this with `02-ARCHITECTURE.md` for data model and `03-CODE-STANDARDS.md` for how it should be coded (no hardcoded values, loading/empty/error states required everywhere, responsive by default).

**Global rules that apply to every screen below:**
- Every button has a visible loading state while its action is in flight, and is disabled during that time to prevent double-submission.
- Every search bar debounces input (300ms) before querying, and shows a matching empty state when no results are found.
- Every list/table paginates beyond ~20 rows.
- Every list/table shows a skeleton loader on initial load, not a blank screen.
- Every destructive action (delete, deactivate, cancel registration) shows a confirmation step before executing.
- Every form validates required fields client-side (React Hook Form + Zod) and re-validates server-side before writing to the database.
- Every role-restricted route redirects unauthorized users to Access Denied via middleware, and is also blocked at the database level via RLS.

---

## GUEST SCREENS (9)

### 1. Landing Page (`/`)
- **Log In** button → navigates to `/login`
- **Sign Up** button → navigates to `/signup`
- Feature cards (Announcements, Events, Concerns, Lost & Found) are static, non-interactive
- Recent announcements preview cards → each clickable, navigates to that announcement's public detail page

### 2. Login Page (`/login`)
- Identifier field (defaults to **Email**), Password field (required, validated)
- **Log In** button → authenticates via Clerk; on success, redirects based on role (`student` → `/dashboard`, `personnel` → `/staff/dashboard`, `admin` → `/admin/dashboard`)
- Invalid credentials → inline error message under the form, no page reload
- **Forgot password?** link → navigates to `/forgot-password` (disabled/hidden when logging in via Campus ID, since reset is tied to the account's email)
- **Google** button → triggers real Clerk OAuth login flow
- **Campus ID** button → **not OAuth.** Clicking it swaps the identifier field's label and placeholder from "Email" (`you@campus.edu`) to "Campus ID" (`CA123456789`), keeping the same password field. On submit, the app looks up the account's email via the entered Campus ID (validated against `^CA[A-Za-z0-9]{9}$`) in Supabase, then authenticates through Clerk using that resolved email — same underlying account, alternate entry point. Invalid format shows an inline error before any lookup is attempted. Campus ID not found shows "No account found with this Campus ID."
- **Sign up** link → navigates to `/signup`
- "Remember me" checkbox → persists session per Clerk's standard session length behavior

### 3. Signup Page (`/signup`)
- Full name, Email, **Campus ID** (required, format `CA` + 9 alphanumeric characters, e.g. `CA4B7X9K2M1`) — validated client-side against `^CA[A-Za-z0-9]{9}$`, then server-side checked against the pre-seeded `seeded_campus_ids` table before submission proceeds. This field is **not self-invented** — it must already exist in the seeded list and be unclaimed.
- Password field (required; meets minimum strength rules)
- **Create account** button → creates the Clerk user with `role: student` set in `publicMetadata` by default, writes `campus_id` to the Supabase `users` table, marks the matching `seeded_campus_ids` row as `is_claimed = true` linked to the new user, and redirects to `/dashboard` on success
- Duplicate email → inline error ("An account with this email already exists")
- Campus ID not found in seeded list → inline error ("This Campus ID isn't recognized. Please check with the registrar.")
- Campus ID already claimed → inline error ("This Campus ID has already been registered.")
- Malformed Campus ID → inline error ("Campus ID must start with CA followed by 9 characters")
- **Google** button → real Clerk OAuth signup flow (Campus ID is still required post-OAuth signup via a short follow-up step, validated the same way against the seeded list)
- **Log in** link → navigates to `/login`

### 4. Forgot Password Page (`/forgot-password`)
- Campus email field (required, validated as email format)
- **Send reset link** button → triggers Clerk's password reset email flow; on success shows a confirmation message in place of the form ("Check your email for reset instructions")
- **Back to login** link → navigates to `/login`

### 5. Public Announcements List (`/announcements`, logged out)
- Search bar → filters visible announcements by title/body match, debounced
- Category filter dropdown → filters by category, combinable with search
- Each announcement card → clickable, navigates to `/announcements/[id]`
- Pagination controls → loads next/previous page of results
- Empty state when search/filter yields no results

### 6. Public Announcement Detail (`/announcements/[id]`, logged out)
- **← Back to announcements** link → returns to `/announcements`
- **Log in for full access** button → navigates to `/login`
- Body content is read-only, static

### 7. Public Events List (`/events`, logged out)
- Search bar → filters by event title/location
- Category filter dropdown
- Each event card's **View details** button → navigates to `/events/[id]`
- Pagination controls

### 8. Public Event Detail (`/events/[id]`, logged out)
- **Log in for full access** button → navigates to `/login`
- **Register for this event** button → if clicked while logged out, redirects to `/login` with a return URL back to this event (so after login, the user lands back here)
- Capacity bar is read-only, reflects live registered/total count

### 9. Public Lost & Found (`/lost-found`, logged out)
- **Lost items** / **Found items** toggle → switches the filtered list between the two types
- Search bar → filters by item name/location, debounced
- **Log in for full access** button → navigates to `/login`
- Item cards are clickable only if the guest is prompted to log in first (or navigate to a read-only public detail, per your implementation choice — recommend gating full detail behind login for this module since it involves contacting a reporter)
- Empty state shown when search yields no items ("No lost & found reports — try another search or switch tabs")

---

## STUDENT SCREENS (14)

### 10. Student Dashboard (`/dashboard`)
- Summary cards (Unread announcements, Upcoming events, Open concerns) → each is clickable, navigates to the respective module's list page
- **View all** links on each section (Recent Announcements, Upcoming Events, My Open Concerns) → navigate to the full list
- Each list item within these sections → clickable, navigates to that item's detail page

### 11. Announcements List (`/announcements`, logged in)
- Same search + category filter behavior as the public version
- Each card → navigates to `/announcements/[id]` (logged-in version, full access, no login gate)
- Empty state on no results

### 12. Announcement Detail (`/announcements/[id]`, logged in)
- **← Back to announcements** link
- Full content visible, no login gate

### 13. Events List (`/events`, logged in)
- Search bar + category filter
- Each event card's **View details** → navigates to `/events/[id]`
- Registered events show a "Registered" badge on the card itself for quick scanning

### 14. Event Detail (`/events/[id]`, logged in)
- **Register for this event** button:
  - If capacity available → registers the student, button changes to "Registered ✓" (disabled), capacity bar and count update immediately
  - If event is full → button is disabled and shows "Event full"
  - If already registered → button shows "Registered ✓" and offers a secondary "Cancel registration" action instead

### 15. My Events (`/events/my`)
- Tabs or filter: Upcoming / Past (optional enhancement; minimum requirement is a combined list with status badges)
- **Cancel registration** button (upcoming events only) → confirmation dialog ("Are you sure you want to cancel your registration for [Event Name]?") → on confirm, removes the registration and decrements the event's registered count
- Past events show a "Past" badge, no cancel option

### 16. Submit a Concern (`/concerns/new`)
- Category dropdown (required) — values sourced from `lib/constants/concernCategories.ts`, not hardcoded inline
- Subject field (required, max length enforced)
- Description textarea (required)
- Attachment upload (optional) → accepts PNG/JPG/PDF up to 10MB, shows filename + remove option once selected, uploads to Supabase Storage on submit
- **Submit concern** button → creates the concern with status `pending`, redirects to `/concerns` with a success toast, and creates a notification for relevant personnel

### 17. My Concerns (`/concerns`)
- Search bar → filters by subject
- Category filter dropdown
- Status filter (via Filters button) → Pending / In Progress / Resolved / Urgent
- **+ Submit concern** button → navigates to `/concerns/new`
- Each row's eye icon / row click → navigates to `/concerns/[id]`
- Empty state: "No concerns yet" with a "Submit a Concern" call-to-action button

### 18. Concern Detail — Student View (`/concerns/[id]`)
- Read-only conversation thread (student's own message + any staff replies)
- Follow-up comment textarea + **Add comment** button → appends a new message to the thread, does not change status (status changes are staff-only)
- Concern details sidebar (status, category, submitted date, assigned team) is read-only for students

### 19. Report Lost/Found Item (`/lost-found/new`)
- **Lost / Found** toggle (required) → determines the `type` field on submission
- Item name field (required)
- Category dropdown (required)
- Location field (required)
- Date field (required, defaults to today, cannot be a future date)
- Description textarea (optional)
- Photo upload (required or strongly recommended) → PNG/JPG up to 10MB, preview shown after selection, uploads to Supabase Storage
- **Submit report** button → creates the item with status `open`, redirects to `/lost-found` with success toast

### 20. Lost & Found List (`/lost-found`, logged in)
- **Lost items** / **Found items** toggle
- Search bar, debounced
- **+ Report an item** button → navigates to `/lost-found/new`
- Each card → navigates to `/lost-found/[id]`
- Empty state per tab when no items match

### 21. Lost & Found Item Detail (`/lost-found/[id]`)
- **Message reporter** button → opens a contact modal/mailto flow to reach the person who filed the report (implementation detail: either an in-app message thread similar to Concerns, or a mailto: link using their Clerk email — decide based on scope/time; mailto is the faster build)
- Status badge is read-only for students

### 22. My Profile (`/profile`)
- Avatar upload (camera icon overlay) → uploads to Supabase Storage, updates `avatar_url`
- Full name field (editable)
- Contact number field (editable)
- Email field (read-only, "Managed by your school account" — since Clerk manages email)
- Account role field (read-only)
- **Save changes** button → updates the `users` table row, shows success toast on completion

### 23. Notifications (`/notifications`)
- **Mark all as read** button → sets all unread notifications for this user to read, clears the unread badge in the sidebar/navbar
- Each notification item → clickable, navigates to the related item (announcement, event, or concern) based on `related_id` and `type`
- Unread notifications show a bold title + blue dot; read notifications are visually de-emphasized
- Realtime: new notifications appear without requiring a manual refresh (Supabase Realtime subscription)

---

## PERSONNEL SCREENS (4)

### 24. Personnel Dashboard (`/staff/dashboard`)
- Summary cards (Open concerns, In progress, Resolved this week) are read-only stats
- "Needs attention" table rows → each clickable, navigates to `/staff/concerns/[id]`

### 25. All Concerns (`/staff/concerns`)
- Search bar → filters by subject or student name
- Category filter dropdown
- **Filters** button → opens status filter options (Pending/In Progress/Resolved/Urgent)
- Each row's eye icon → navigates to `/staff/concerns/[id]`

### 26. Concern Detail — Staff View (`/staff/concerns/[id]`)
- Conversation thread (same as student view, plus staff's own replies distinguished visually)
- Reply textarea + **Send response** button → appends a message to the thread and notifies the student
- **Status dropdown** (Pending / In Progress / Resolved / Urgent) → updates the concern's status immediately on change, triggers a notification to the student
- Concern details sidebar shows category, submitted date, and assigned team (read display; reassignment is admin-only, per role scope)

### 27. Lost & Found Management (`/staff/lost-found`)
- Search bar + category filter
- Each row's pencil icon → opens an edit modal (status change: Open → Claimed)
- **...** menu → additional actions (e.g., view full detail, delete if within scope)
- Status change confirmed via the modal's save action, updates immediately in the table

---

## ADMIN SCREENS (9)

### 28. Admin Dashboard (`/admin/dashboard`)
- Summary cards (Total users, Active concerns, Upcoming events, Open item reports) — read-only, pulled live from aggregate queries
- **Concerns by status** bar chart — read-only visualization (Recharts), reflects live data
- **New user signups** line chart — read-only visualization, reflects live data over a rolling period

### 29. Manage Announcements (`/admin/announcements`)
- Search bar + category filter
- **+ New Announcement** button → opens the create modal:
  - Title (required), Category dropdown (required), Audience dropdown (e.g., "Everyone (public)" vs a restricted audience), Body (required, rich text or plain textarea), Attached image upload (optional)
  - **Publish immediately** toggle → if on, sets status to `published` on save; if off, saves as `draft`
  - **Save draft** / **Publish** buttons → both submit the form, differing only in resulting status
- Each row's pencil icon → opens the same modal pre-filled for editing
- Each row's **...** menu → Delete (with confirmation), Duplicate (optional stretch)
- Status badge (Published/Draft) reflects current state

### 30. Manage Events (`/admin/events`)
- Search bar + category filter
- **+ New Event** button → opens the create modal:
  - Title (required), Category dropdown, Capacity (required, numeric), Start date & time (required), End date & time (required, must be after start), Location (required), Description (required), Cover image upload (optional)
  - **Publish immediately** toggle, **Save draft** / **Publish** buttons — same pattern as Announcements
- Each row's pencil icon → edit modal pre-filled
- Each row's **...** menu → Delete (confirmation required; if the event has existing registrants, warn before deleting)
- Registrant count per row → clickable, navigates to `/admin/events/[id]/registrants`

### 31. Event Registrants (`/admin/events/[id]/registrants`)
- Search bar → filters registrants by name/email
- **Export list** button → downloads a CSV of the registrant list (name, email, registration date)
- Read-only table, no edit actions

### 32. Manage Concerns (`/admin/concerns`)
- Search bar, category filter, status filter (same pattern as Personnel's list)
- Each row's eye icon → navigates to a full concern detail view (admin has the same reply/status capability as personnel, plus reassignment)
- Each row's person-icon → opens the **Assign to personnel** modal:
  - Dropdown listing available personnel/teams
  - Warning text: "The selected team will be notified and can update the concern immediately"
  - **Confirm assignment** button → updates `assigned_to`, notifies the newly assigned personnel

### 33. Manage Lost & Found (`/admin/lost-found`)
- Same functionality as Personnel's Lost & Found management, plus a delete/archive action via the **...** menu (personnel cannot delete, only update status — this is the access difference between the two roles)

### 34. Manage Users (`/admin/users`)
- Search bar + role filter (via Filters button)
- Each row's pencil icon → opens the **Change account role** modal:
  - Current role displayed, **New role** dropdown (Student/Personnel/Admin)
  - Warning: "Permission changes take effect immediately. Admin access includes user and campus-wide management."
  - **Confirm change** button → updates the user's role in both Clerk's `publicMetadata` and the Supabase `users` table (keep both in sync)
- Each row's **...** menu → Deactivate/Reactivate account (confirmation required; deactivated users cannot log in but their historical data remains)

### 35. Manage Campus IDs (`/admin/campus-ids`)
- **New addition** to support the pre-seeded Campus ID model.
- Table listing every seeded Campus ID: ID value, claim status (Unclaimed/Claimed), and the linked student's name if claimed.
- Search bar → filters by ID
- **+ Add Campus ID** button → opens a modal with a single field (validated against `^CA[A-Za-z0-9]{9}$`) to add one ID at a time — **this is the required MVP path**; for development/demo, seed a handful of sample IDs directly (see `02-ARCHITECTURE.md` §9) rather than relying on this UI at first
- **Bulk import** button (CSV upload) → **stretch goal, not required for MVP.** Only build this once a real school-provided ID list exists to import; until then, manual single-entry (or direct database seeding) is sufficient
- Each unclaimed row's **...** menu → Delete (only available while unclaimed; claimed IDs cannot be deleted without also handling the linked account)

### 36. Reports & Insights (`/admin/reports`)
- Search/filter bar for report data (date range, category)
- Summary cards (Concerns resolved, Active concerns, Upcoming events, Open item reports) — read-only
- **Concerns by status** bar chart, **Lost & found resolution rate** donut chart, **Events by attendance** bar chart — all read-only visualizations reflecting the selected filter range
- **Export CSV/PDF** button → downloads the currently filtered report data in the selected format

---

## SYSTEM SCREENS (2)

### 37. 404 Not Found
- **Go home** button → navigates to `/` (or role-appropriate dashboard if logged in)

### 38. Access Denied
- **Back to dashboard** button → navigates to the role-appropriate dashboard (student/personnel/admin), or `/` if somehow reached while logged out

---

## Cross-Cutting Functional Requirements (apply across all screens above)
- **Global search bar** (top navbar, logged-in views) → should search across announcements, events, and concerns the user has access to, showing a unified results dropdown or dedicated search results page
- **Notification bell** (top navbar) → shows unread count badge, clicking navigates to `/notifications`, updates in realtime
- **Avatar/profile menu** (top navbar) → dropdown with Profile, and Log Out (which ends the Clerk session and redirects to landing)
- **Sidebar navigation** → active route is visually highlighted; collapses to a mobile-friendly pattern (hamburger or bottom nav) below 768px width
