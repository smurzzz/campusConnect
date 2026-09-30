/** Product-wide copy, limits and tunables (no business rules live here). */
export const APP_NAME = "CampusConnect";
export const APP_TAGLINE = "Your campus, connected";
export const APP_DESCRIPTION =
  "CampusConnect unifies announcements, events, lost and found reporting, and student concerns for ICCT Colleges in one place.";

export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

/** University contact details reused across public and auth surfaces. */
export const UNIVERSITY = {
  name: "ICCT Colleges",
  shortName: "ICCT",
  address: "Sumulong Highway, Cainta, Rizal, Philippines",
  supportEmail: "support@campusconnect.app",
  supportPhone: "+1 (555) 010-7788",
  officeHours: "Monday to Friday, 8:00 – 18:00",
} as const;

/** UX tunables mandated by the project standards. */
export const SEARCH_DEBOUNCE_MS = 300;
export const DEFAULT_PAGE_SIZE = 8;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_UPLOAD_TYPES = ["image/png", "image/jpeg", "image/webp", "application/pdf"];
export const MAX_CONCERN_MESSAGES_PAGE = 20;
