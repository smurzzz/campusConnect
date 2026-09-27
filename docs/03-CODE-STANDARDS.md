# CampusConnect — Code Standards

These rules exist to keep the app smooth to render, easy to maintain, and free of hardcoded values that break when data or environments change.

## 1. No Hardcoding — Ever

**Never hardcode:**
- API keys, URLs, secrets → `.env.local`, accessed via `lib/env.ts`
- Role names, statuses, categories → `lib/constants/roles.ts`, `lib/constants/statuses.ts`, etc.
- Validation patterns reused in more than one place (e.g. the Campus ID format `^CA[A-Za-z0-9]{9}$`) → `lib/validators/campusId.ts`, imported wherever signup or login needs it, never retyped inline
- Route paths → `lib/constants/routes.ts` (a single source of truth for every route string)
- Copy/labels repeated more than once → a shared constants or i18n-ready strings file
- Colors/spacing outside the Tailwind config → extend `tailwind.config.ts`, don't inline hex codes
- Table column definitions duplicated across pages → shared column config objects
- Magic numbers (page size, timeout durations, capacity limits) → named constants

**Example — wrong:**
```tsx
if (user.role === "admin") { ... }
<Link href="/admin/concerns">Concerns</Link>
```

**Example — right:**
```tsx
import { ROLES } from "@/lib/constants/roles";
import { ROUTES } from "@/lib/constants/routes";

if (user.role === ROLES.ADMIN) { ... }
<Link href={ROUTES.ADMIN.CONCERNS}>Concerns</Link>
```

## 2. Component Standards
- One component per file, named exports preferred over default where practical.
- Presentational components (`/components/ui`) contain no data-fetching or business logic.
- Feature components (`/components/features`) compose UI primitives + hooks; they receive data via props or fetch via a dedicated hook (`useConcerns()`, `useAnnouncements()`), never inline `fetch`/`supabase.from()` calls scattered through JSX.
- Every list/table component accepts an explicit `isLoading`, `isEmpty`, and `error` state — never assume data is always present.

## 3. Forms
- All forms use **React Hook Form + Zod**. Validation schemas live in `/lib/validators/`, shared between client validation and server-side re-validation (never trust client validation alone).
- Every submit button shows a loading/disabled state while the request is in flight — no double-submits.
- Every form shows field-level error messages, not just a generic toast.

## 4. Data Fetching Rules
- Prefer **Server Components** for initial page data (fast first paint, no loading spinner needed for the first load).
- Use **Server Actions** for mutations (create/update/delete) instead of manually wired API routes where possible.
- Client-side fetching (`useEffect` + fetch) is reserved for data that must update without a full page reload (e.g., notification bell polling/subscription).
- Every Supabase query specifies exact columns needed — no `select('*')` in list views.
- Pagination is required on every list that can exceed ~20 rows; never fetch an unbounded table.

## 5. Styling
- Tailwind utility classes only — no inline `style={{}}` unless dynamically computed (e.g., a progress bar width from a variable).
- Shared design tokens (colors, radii, spacing) live in `tailwind.config.ts`, referenced by class name, not repeated as raw values.
- Responsive classes (`sm:`, `md:`, `lg:`) are mandatory on any layout component — no fixed-width containers that break on mobile.

## 6. State & Performance
- Avoid unnecessary `"use client"` — only mark a component client-side if it uses hooks, event handlers, or browser APIs.
- Memoize expensive derived values (`useMemo`) only when a measurable re-render cost exists — don't over-optimize prematurely.
- Debounce search inputs (300ms) before firing a query — never fire a request on every keystroke.
- Use skeleton loaders, not blank screens or layout-shifting spinners, for perceived smoothness.
- Images always go through `next/image` with defined `width`/`height` or `fill` + a sized parent — prevents layout shift (CLS).

## 7. Error Handling
- Every Supabase/Clerk call is wrapped in try/catch (or `.then/.catch` for Server Actions returning `{ error }`).
- User-facing errors are human-readable ("Couldn't submit your concern — please try again"), not raw error objects or stack traces.
- Network/auth failures degrade gracefully — never a blank white screen.

## 8. Naming Conventions
| Type | Convention | Example |
|---|---|---|
| Components | PascalCase | `ConcernCard.tsx` |
| Hooks | camelCase, `use` prefix | `useConcerns.ts` |
| Constants | SCREAMING_SNAKE_CASE (object keys) | `ROLES.ADMIN` |
| DB tables/columns | snake_case | `concern_messages`, `student_id` |
| Route folders | kebab-case | `/lost-found` |

## 9. Git & Commits
- Feature branches per module (`feature/concerns-crud`, `feature/admin-dashboard`).
- Commit messages describe intent, not just file names ("Add concern status update with RLS check" not "update file").
- No secrets or `.env` files ever committed — confirm `.gitignore` covers them before first push.

## 10. Definition of "Done" for a Screen
A screen/feature is not done until:
- [ ] No hardcoded strings/values remain (checked against this document)
- [ ] Loading, empty, and error states are implemented
- [ ] Mobile responsive (tested at 375px, 768px, 1280px)
- [ ] Role-based access verified (both middleware redirect and RLS block unauthorized access)
- [ ] Form validation (if applicable) covers required fields and shows inline errors
- [ ] No console errors/warnings in the browser
