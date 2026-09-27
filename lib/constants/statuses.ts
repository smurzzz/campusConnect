/** Status vocabularies + their visual tone, shared by badges, filters and tables. */
export type StatusTone = "success" | "warning" | "danger" | "neutral";

export const CONCERN_STATUSES = {
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  URGENT: "Urgent",
} as const;
export type ConcernStatus = (typeof CONCERN_STATUSES)[keyof typeof CONCERN_STATUSES];
export const CONCERN_STATUS_VALUES = Object.values(CONCERN_STATUSES) as ConcernStatus[];
export const CONCERN_STATUS_TONES: Record<ConcernStatus, StatusTone> = {
  [CONCERN_STATUSES.PENDING]: "warning",
  [CONCERN_STATUSES.IN_PROGRESS]: "warning",
  [CONCERN_STATUSES.RESOLVED]: "success",
  [CONCERN_STATUSES.URGENT]: "danger",
};

export const PUBLICATION_STATUSES = {
  PUBLISHED: "Published",
  DRAFT: "Draft",
} as const;
export type PublicationStatus = (typeof PUBLICATION_STATUSES)[keyof typeof PUBLICATION_STATUSES];
export const PUBLICATION_STATUS_VALUES = Object.values(PUBLICATION_STATUSES) as PublicationStatus[];
export const PUBLICATION_STATUS_TONES: Record<PublicationStatus, StatusTone> = {
  [PUBLICATION_STATUSES.PUBLISHED]: "success",
  [PUBLICATION_STATUSES.DRAFT]: "neutral",
};

export const ITEM_STATUSES = {
  OPEN: "Open",
  CLAIMED: "Claimed",
} as const;
export type ItemStatus = (typeof ITEM_STATUSES)[keyof typeof ITEM_STATUSES];
export const ITEM_STATUS_VALUES = Object.values(ITEM_STATUSES) as ItemStatus[];
export const ITEM_STATUS_TONES: Record<ItemStatus, StatusTone> = {
  [ITEM_STATUSES.OPEN]: "success",
  [ITEM_STATUSES.CLAIMED]: "neutral",
};

export const ITEM_TYPES = {
  LOST: "Lost",
  FOUND: "Found",
} as const;
export type ItemType = (typeof ITEM_TYPES)[keyof typeof ITEM_TYPES];

export const ACCOUNT_STATUSES = {
  ACTIVE: "Active",
  DEACTIVATED: "Deactivated",
} as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[keyof typeof ACCOUNT_STATUSES];
export const ACCOUNT_STATUS_VALUES = Object.values(ACCOUNT_STATUSES) as AccountStatus[];
export const ACCOUNT_STATUS_TONES: Record<AccountStatus, StatusTone> = {
  [ACCOUNT_STATUSES.ACTIVE]: "success",
  [ACCOUNT_STATUSES.DEACTIVATED]: "neutral",
};

export const ATTENDANCE_LABELS = {
  GOING: "Going",
  INTERESTED: "Interested",
  NOT_GOING: "Not going",
} as const;
export type AttendanceLabel = (typeof ATTENDANCE_LABELS)[keyof typeof ATTENDANCE_LABELS];

export const NOTIFICATION_TYPES = {
  ANNOUNCEMENT: "announcement",
  EVENT: "event",
  CONCERN: "concern",
  LOST_FOUND: "lost_found",
  SYSTEM: "system",
} as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

export const REPORT_KINDS = {
  CONCERN_CATEGORIES: "Concern categories",
  EVENT_ATTENDANCE: "Event attendance",
  LOST_FOUND: "Lost and found",
  USER_GROWTH: "User growth",
} as const;
export type ReportKind = (typeof REPORT_KINDS)[keyof typeof REPORT_KINDS];

/** "All …" option shared by select filters. */
export const ALL_OPTION = "All";
