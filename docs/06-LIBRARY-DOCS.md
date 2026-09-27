# CampusConnect — Library & Dependency Documentation

## Core Framework
| Library | Purpose | Docs |
|---|---|---|
| **Next.js** (App Router) | Frontend framework, routing, Server Components/Actions | https://nextjs.org/docs |
| **React** | UI library (used via Next.js) | https://react.dev |
| **TypeScript** | Type safety across the codebase | https://www.typescriptlang.org/docs |

## Styling
| Library | Purpose | Docs |
|---|---|---|
| **Tailwind CSS** | Utility-first styling | https://tailwindcss.com/docs |
| **shadcn/ui** | Prebuilt accessible components built on Radix + Tailwind | https://ui.shadcn.com |
| **lucide-react** | Icon set | https://lucide.dev |

## Auth & Backend
| Library | Purpose | Docs |
|---|---|---|
| **Clerk** | Authentication, session management, role metadata | https://clerk.com/docs |
| **@supabase/supabase-js** | Database client (Postgres), Storage, Realtime | https://supabase.com/docs/reference/javascript |
| **Supabase third-party auth (Clerk integration)** | Connects Clerk JWT to Supabase RLS | https://supabase.com/docs/guides/auth/third-party/clerk |

## Forms & Validation
| Library | Purpose | Docs |
|---|---|---|
| **react-hook-form** | Form state management | https://react-hook-form.com |
| **zod** | Schema validation (client + server) | https://zod.dev |
| **@hookform/resolvers** | Connects Zod schemas to react-hook-form | https://github.com/react-hook-form/resolvers |

## Data Display
| Library | Purpose | Docs |
|---|---|---|
| **recharts** | Admin dashboard charts | https://recharts.org |
| **date-fns** | Date formatting/manipulation | https://date-fns.org |
| **@tanstack/react-table** (optional) | Advanced table sorting/filtering if native implementation gets complex | https://tanstack.com/table |

## Email (Optional/Stretch)
| Library | Purpose | Docs |
|---|---|---|
| **resend** | Transactional email sending | https://resend.com/docs |
| **react-email** (optional) | Email template components | https://react.email |

## Dev Tooling
| Tool | Purpose | Docs |
|---|---|---|
| **ESLint** | Code linting | https://eslint.org |
| **Prettier** | Code formatting | https://prettier.io |
| **Vercel CLI** | Local preview of deployment behavior | https://vercel.com/docs/cli |

## Environment Variables Reference
```
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # server-side only, never exposed to client

# Email (optional)
RESEND_API_KEY=

# App
NEXT_PUBLIC_APP_URL=https://campusconnectph.site
```

## Installation Reference
```bash
npx create-next-app@latest campusconnect --typescript --tailwind --app
cd campusconnect

npm install @clerk/nextjs
npm install @supabase/supabase-js
npm install react-hook-form zod @hookform/resolvers
npm install recharts date-fns
npm install lucide-react
npx shadcn@latest init
```

## Notes on Version Pinning
Pin exact versions in `package.json` (not `^` ranges) once the project stabilizes, to avoid unexpected breaking changes from dependency updates mid-development — especially for Clerk and Supabase, which ship frequent updates.
