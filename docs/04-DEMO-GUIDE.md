# CampusConnect — Demo Guide

Use this as a script for presenting the system to a panel, adviser, or stakeholder. Each section is a role-based walkthrough in a natural order.

## Setup Before Demo
- Have 3 test accounts ready: one Student, one Personnel, one Admin (plus staying logged out for the Guest portion).
- Seed the database with realistic sample data (2–3 announcements, 2–3 events with varied registration counts, 3–4 concerns in different statuses, 2–3 lost & found items).
- Open the app in a clean browser window (no dev tools visible) at a reasonable zoom level.

## 1. Guest Experience (2 min)
1. Start at the Landing page — point out the value proposition and stats.
2. Click "Announcements" in the navbar → show the public list, then click into one → show detail page with the "Log in for full access" prompt.
3. Click "Events" → show the public grid, click into an event → show capacity bar and the login-gated "Register" button.
4. Click "Lost & Found" → toggle between Lost/Found tabs, demonstrate search returning an empty state.
5. Click "Sign up" → show the registration form, including the Campus ID field — mention it validates against a pre-seeded list of real student IDs, not just any typed-in value (don't submit yet).
6. On the Login page, click the "Campus ID" button → show the field swap from Email to Campus ID as an alternate login method tied to the same account.

**Talking point:** guests can browse everything public without an account; only actions (register, submit, report) require login.

## 2. Student Experience (5–6 min)
1. Log in as the student test account → land on Dashboard.
2. Walk through the dashboard summary cards (unread announcements, upcoming events, open concerns).
3. Click "View all" on Recent Announcements → open one → show back navigation.
4. Go to Events → register for an event → show the capacity bar update and button state change to "Registered ✓".
5. Go to "My Events" → show the newly registered event, demonstrate "Cancel registration."
6. Go to Concerns → "Submit a concern" → fill and submit → land on "My Concerns" showing the new entry as Pending.
7. Click into the concern → show the conversation thread (empty at first, or one round-trip if pre-seeded).
8. Go to Lost & Found → report a new item with a photo → confirm it appears in the browse list.
9. Open Notifications → show the bell badge and the notification list.
10. Open Profile → show editable fields, save a change.

**Talking point:** every student action (submit, register, report) is tied to their own account via RLS — they can only see and edit their own data.

## 3. Personnel Experience (3 min)
1. Log in as the personnel test account → land on Personnel Dashboard.
2. Point out the "Needs attention" table pulling from the same concern the student just submitted.
3. Click into that concern → show the status dropdown and reply box → change status to "In Progress" and send a response.
4. Switch to the student account (or explain) to show the status update now reflects live on the student's side.
5. Go to Lost & Found management → mark an item as "Claimed."

**Talking point:** personnel only see Concerns and Lost & Found — no access to Announcements/Events management or Users, demonstrating role-scoped navigation.

## 4. Admin Experience (5 min)
1. Log in as the admin test account → land on Admin Dashboard → point out the charts (concerns by status, new signups).
2. Go to Manage Announcements → click "+ New Announcement" → fill the modal → publish → show it now appears on the public feed.
3. Go to Manage Events → click "+ New Event" → fill the modal → publish.
4. Go to an event's registrant list → show exported data view.
5. Go to Manage Concerns → assign a concern to a personnel team → show the assignment modal.
6. Go to Manage Users → change a user's role → show the confirmation warning.
7. Go to Reports → point out the exportable stats and charts (concerns by status, lost & found resolution rate, events by attendance).

**Talking point:** Admin has full visibility and control across every module — this is the layer that proves the system is centrally manageable, matching the original problem statement (scattered, hard-to-manage student services).

## 5. Wrap-Up (1 min)
- Show the 404 and Access Denied pages briefly (navigate to a bad URL, or attempt a student trying to hit `/admin/dashboard` directly) to demonstrate both graceful error handling and enforced role boundaries.
- Close by restating: one login, four roles, five modules, fully responsive, deployed live.

## Timing Summary
| Section | Time |
|---|---|
| Guest | 2 min |
| Student | 5–6 min |
| Personnel | 3 min |
| Admin | 5 min |
| Wrap-up | 1 min |
| **Total** | **~16–17 min** |

Trim the Student section first if you need to shorten — it's the longest but also has the most repeated CRUD patterns, so panels grasp the pattern quickly.
