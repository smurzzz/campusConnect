# CampusConnect — Testing Report

Fill this in as you test each module. Keep results here as a running log — useful both for catching bugs and as evidence for your proposal's "Testing and Quality Assurance" phase.

## Test Environment
- Browser(s) tested: _____________
- Device/viewport sizes tested: Mobile (375px) / Tablet (768px) / Desktop (1280px+)
- Test accounts used: Student / Personnel / Admin / Guest
- Date range of testing: _____________

## 1. Functional Testing

### Authentication
| Test Case | Steps | Expected Result | Pass/Fail | Notes |
|---|---|---|---|---|
| Sign up as student | Fill signup form, submit | Account created, redirected to dashboard | | |
| Log in with valid credentials | Enter email/password, submit | Redirected to role-appropriate dashboard | | |
| Log in with invalid credentials | Enter wrong password | Clear error shown, no crash | | |
| Forgot password flow | Request reset, follow link | Password successfully changed | | |
| Access admin route as student | Navigate directly to `/admin/dashboard` | Redirected to Access Denied | | |
| Log out | Click log out | Session cleared, redirected to landing | | |
| Sign up with a valid seeded Campus ID | Enter an unclaimed ID from `seeded_campus_ids` | Account created, ID marked as claimed | | |
| Sign up with an unrecognized Campus ID | Enter an ID not in the seeded list | Inline error: "This Campus ID isn't recognized" | | |
| Sign up with an already-claimed Campus ID | Enter an ID already linked to another account | Inline error: "This Campus ID has already been registered" | | |
| Sign up with malformed Campus ID | Enter an ID not matching `^CA[A-Za-z0-9]{9}$` | Inline format error, no server call made | | |
| Log in via Campus ID | Click "Campus ID" toggle, enter valid ID + password | Field swaps correctly, authenticates to the same account as email login | | |
| Log in with Google | Complete Google OAuth flow | Account created/logged in correctly, role assigned | | |

### Announcements
| Test Case | Expected Result | Pass/Fail | Notes |
|---|---|---|---|
| Guest views public announcements | List loads, no login required | | |
| Guest opens announcement detail | Full content visible, "Log in for full access" shown | | |
| Student searches announcements | Filtered results match query | | |
| Student search with no matches | Empty state shown | | |
| Admin creates announcement (draft) | Saved as draft, not visible publicly | | |
| Admin publishes announcement | Appears immediately on public/student feed | | |
| Admin edits announcement | Changes reflected on next load | | |
| Admin deletes announcement | Removed from all views | | |

### Events
| Test Case | Expected Result | Pass/Fail | Notes |
|---|---|---|---|
| Student registers for event | Capacity count increments, button changes to "Registered" | | |
| Student registers for full event | Registration blocked, clear message shown | | |
| Student cancels registration | Removed from "My Events," capacity decrements | | |
| Admin creates event | Appears on public/student events list | | |
| Admin views registrants list | Accurate list of registered students | | |

### Concerns
| Test Case | Expected Result | Pass/Fail | Notes |
|---|---|---|---|
| Student submits concern | Appears in "My Concerns" as Pending | | |
| Student submits with attachment | File uploads successfully, visible on detail page | | |
| Personnel views all concerns | Full list visible, filterable by status | | |
| Personnel responds to concern | Message appears in thread, student notified | | |
| Personnel updates status | Status change reflected on student's view | | |
| Admin assigns concern to personnel | Assignment saved, correct personnel sees it | | |
| Student attempts to view another student's concern (direct URL) | Blocked by RLS, Access Denied or 404 | | |

### Lost & Found
| Test Case | Expected Result | Pass/Fail | Notes |
|---|---|---|---|
| Student reports lost item with photo | Item appears in browse list with photo | | |
| Student reports found item | Appears under "Found items" tab | | |
| Personnel marks item as claimed | Status updates across all views | | |
| Search with no results | Empty state shown correctly | | |

### Notifications
| Test Case | Expected Result | Pass/Fail | Notes |
|---|---|---|---|
| New announcement triggers notification | Appears in recipient's notification list | | |
| Concern status change triggers notification | Student sees it in notifications | | |
| Mark all as read | Unread badge clears | | |

### User Management (Admin)
| Test Case | Expected Result | Pass/Fail | Notes |
|---|---|---|---|
| Admin changes user role | Confirmation shown, role updated, permissions take effect immediately | | |
| Admin deactivates a user | User can no longer log in | | |

## 2. Usability Testing
| Area | Question | Rating (1–5) | Notes |
|---|---|---|---|
| Navigation clarity | Can a new user find core features without guidance? | | |
| Form clarity | Are validation errors clear and actionable? | | |
| Mobile experience | Is the layout usable on a phone without horizontal scrolling? | | |
| Loading feedback | Does the user always know when something is loading? | | |
| Empty states | Are "no data" states clear and not confusing? | | |

## 3. Security Testing
| Test Case | Expected Result | Pass/Fail | Notes |
|---|---|---|---|
| Direct API/DB access bypassing UI | RLS blocks unauthorized reads/writes | | |
| Role tampering (modify JWT claim client-side) | Server-side check still rejects | | |
| SQL injection attempt in search fields | Input safely escaped/parameterized (Supabase client handles this by default — verify no raw string concatenation is used anywhere) | | |
| File upload of non-image/oversized file | Rejected with clear error | | |
| Session expiry | Expired session redirects to login, no stale data shown | | |

## 4. Performance Checks
| Check | Target | Actual | Pass/Fail |
|---|---|---|---|
| Landing page load (Lighthouse) | > 90 performance score | | |
| Largest Contentful Paint | < 2.5s | | |
| No layout shift on image-heavy pages (Lost & Found, Events) | CLS < 0.1 | | |
| List pages paginate rather than load all rows | Confirmed | | |

## 5. Bug Log
| # | Description | Severity | Status | Fixed In |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |

## Sign-Off
- [ ] All functional test cases pass
- [ ] No critical/high severity bugs open
- [ ] Responsive on mobile, tablet, desktop
- [ ] Security checks pass
- [ ] Ready for deployment
