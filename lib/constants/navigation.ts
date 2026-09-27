import { ROUTES } from "@/lib/constants/routes";

/**
 * Path → screen title map used by the app shell breadcrumb/heading. Data only
 * (no components) so it can be imported from server and client modules alike.
 */
const PAGE_TITLES: { prefix: string; title: string }[] = [
  { prefix: ROUTES.ADMIN.DASHBOARD, title: "Admin overview" },
  { prefix: ROUTES.ADMIN.ANNOUNCEMENTS, title: "Manage announcements" },
  { prefix: ROUTES.ADMIN.EVENTS, title: "Manage events" },
  { prefix: ROUTES.ADMIN.CONCERNS, title: "Concern oversight" },
  { prefix: ROUTES.ADMIN.LOST_FOUND, title: "Lost & found oversight" },
  { prefix: ROUTES.ADMIN.USERS, title: "User management" },
  { prefix: ROUTES.ADMIN.CAMPUS_IDS, title: "Campus ID allocation" },
  { prefix: ROUTES.ADMIN.REPORTS, title: "Reports" },
  { prefix: ROUTES.STAFF.DASHBOARD, title: "Personnel dashboard" },
  { prefix: ROUTES.STAFF.CONCERNS, title: "All concerns" },
  { prefix: ROUTES.STAFF.LOST_FOUND, title: "Lost & found management" },
  { prefix: ROUTES.CONCERN_NEW, title: "Submit a concern" },
  { prefix: ROUTES.CONCERNS, title: "My concerns" },
  { prefix: ROUTES.LOST_FOUND_NEW, title: "Report an item" },
  { prefix: ROUTES.MY_EVENTS, title: "My events" },
  { prefix: ROUTES.DASHBOARD, title: "Dashboard" },
  { prefix: ROUTES.PROFILE, title: "Profile" },
  { prefix: ROUTES.NOTIFICATIONS, title: "Notifications" },
  { prefix: ROUTES.ANNOUNCEMENTS, title: "Announcements" },
  { prefix: ROUTES.EVENTS, title: "Events" },
  { prefix: ROUTES.LOST_FOUND, title: "Lost & found" },
];

export function pageTitleForPath(pathname: string): string {
  const match = PAGE_TITLES.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  return match?.title ?? "CampusConnect";
}
