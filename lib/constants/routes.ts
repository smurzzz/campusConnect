/**
 * Single source of truth for every in-app path. Screens import from here so
 * route changes never require hunting through components.
 */
import { ROLES, type Role } from "@/lib/constants/roles";

export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  SIGNUP: "/signup",
  FORGOT_PASSWORD: "/forgot-password",
  ACCESS_DENIED: "/access-denied",

  ANNOUNCEMENTS: "/announcements",
  announcementDetail: (id: string) => `/announcements/${id}`,

  EVENTS: "/events",
  eventDetail: (id: string) => `/events/${id}`,
  MY_EVENTS: "/events/my",

  LOST_FOUND: "/lost-found",
  LOST_FOUND_NEW: "/lost-found/new",
  lostFoundDetail: (id: string) => `/lost-found/${id}`,

  DASHBOARD: "/dashboard",
  CONCERNS: "/concerns",
  CONCERN_NEW: "/concerns/new",
  concernDetail: (id: string) => `/concerns/${id}`,

  NOTIFICATIONS: "/notifications",
  PROFILE: "/profile",

  STAFF: {
    DASHBOARD: "/staff/dashboard",
    CONCERNS: "/staff/concerns",
    concernDetail: (id: string) => `/staff/concerns/${id}`,
    LOST_FOUND: "/staff/lost-found",
  },

  ADMIN: {
    DASHBOARD: "/admin/dashboard",
    ANNOUNCEMENTS: "/admin/announcements",
    EVENTS: "/admin/events",
    eventRegistrants: (id: string) => `/admin/events/${id}/registrants`,
    CONCERNS: "/admin/concerns",
    LOST_FOUND: "/admin/lost-found",
    USERS: "/admin/users",
    CAMPUS_IDS: "/admin/campus-ids",
    REPORTS: "/admin/reports",
  },
} as const;

/** Signed-in landing screen per role. */
export function dashboardRouteForRole(role: string | null | undefined): string {
  switch (role) {
    case "admin":
      return ROUTES.ADMIN.DASHBOARD;
    case "personnel":
      return ROUTES.STAFF.DASHBOARD;
    default:
      return ROUTES.DASHBOARD;
  }
}

/** Clerk uses `redirect_url` to resume the interrupted journey. */
export function loginRoute(returnTo?: string): string {
  return returnTo ? `${ROUTES.LOGIN}?redirect_url=${encodeURIComponent(returnTo)}` : ROUTES.LOGIN;
}

/**
 * Role-gated route prefixes, consumed by `proxy.ts`.
 * `/admin` is admin-only; `/staff` also accepts admins so oversight screens can
 * be actioned by an administrator.
 */
export const ROLE_GUARDED_PREFIXES: readonly { prefix: string; roles: readonly Role[] }[] = [
  { prefix: "/admin", roles: [ROLES.ADMIN] },
  { prefix: "/staff", roles: [ROLES.PERSONNEL, ROLES.ADMIN] },
];
