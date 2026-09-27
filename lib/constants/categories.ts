import { ALL_OPTION } from "@/lib/constants/statuses";

/** Controlled vocabularies for every module's category/audience selects. */
export const ANNOUNCEMENT_CATEGORIES = [
  "Academic",
  "Campus Life",
  "Financial Aid",
  "Facilities",
  "Safety",
] as const;
export type AnnouncementCategory = (typeof ANNOUNCEMENT_CATEGORIES)[number];

export const ANNOUNCEMENT_AUDIENCES = ["Everyone", "Students only", "Personnel only"] as const;
export type AnnouncementAudience = (typeof ANNOUNCEMENT_AUDIENCES)[number];

export const EVENT_CATEGORIES = [
  "Academic",
  "Arts & Culture",
  "Sports",
  "Careers",
  "Community",
] as const;
export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export const CONCERN_CATEGORIES = ["Academic", "Facility", "Administrative", "Other"] as const;
export type ConcernCategory = (typeof CONCERN_CATEGORIES)[number];

export const PERSONNEL_TEAMS = [
  "Student Services",
  "Facilities Team",
  "Safety Office",
  "Academic Affairs",
] as const;
export type PersonnelTeam = (typeof PERSONNEL_TEAMS)[number];

export const LOST_FOUND_CATEGORIES = [
  "Personal item",
  "Electronics",
  "Documents",
  "Keys",
  "Clothing",
  "Other",
] as const;
export type LostFoundCategory = (typeof LOST_FOUND_CATEGORIES)[number];

export const CAMPUS_LOCATIONS = [
  "Ashby Library",
  "Bellhaven Hall",
  "Cedar Court",
  "Dockside Union",
  "East Quad",
  "Founders Hall",
  "Greenwood Hall",
  "Harper Gym",
  "Innovation Lab",
  "Juniper Residences",
  "Kingsley Hall",
  "Library Courtyard",
  "Maplewood Hall",
  "Northbridge Sports Centre",
  "Oakley Building",
  "Riverside Hall",
  "Student Union",
  "West Hall",
] as const;
export type CampusLocation = (typeof CAMPUS_LOCATIONS)[number];

export const ALL_CATEGORIES = ALL_OPTION;
export const ALL_STATUSES = ALL_OPTION;
export const ALL_LOCATIONS = ALL_OPTION;
export const ALL_AUDIENCES = ALL_OPTION;
export const ALL_CAMPUS_ID_FILTERS = [ALL_OPTION, "Claimed", "Unclaimed"] as const;
export const ALL_ROLES_FILTER = ALL_OPTION;
