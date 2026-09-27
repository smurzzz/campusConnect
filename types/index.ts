import type {
  AnnouncementAudience,
  AnnouncementCategory,
  CampusLocation,
  ConcernCategory,
  EventCategory,
  LostFoundCategory,
  PersonnelTeam,
} from "@/lib/constants/categories";
import type { Role } from "@/lib/constants/roles";
import type {
  AccountStatus,
  AttendanceLabel,
  ConcernStatus,
  ItemStatus,
  ItemType,
  NotificationType,
  PublicationStatus,
} from "@/lib/constants/statuses";

/** Gradient covers used by event cards (kept as data, not styling decisions). */
export type CoverTone = "blue" | "green" | "amber";

export type Author = {
  name: string;
  role: string;
  initials: string;
};

export type Announcement = {
  id: string;
  title: string;
  category: AnnouncementCategory;
  date: string;
  excerpt: string;
  body: string[];
  status: PublicationStatus;
  audience: AnnouncementAudience;
  author: Author;
  readMinutes: number;
};

export type CampusEvent = {
  id: string;
  title: string;
  description: string;
  day: string;
  month: string;
  fullDate: string;
  startTime: string;
  endTime: string;
  location: CampusLocation;
  category: EventCategory;
  capacity: number;
  registered: number;
  tone: CoverTone;
  owner: string;
  attendance: AttendanceLabel;
};

export type ConcernMessage = {
  id: string;
  author: string;
  role: "student" | "staff";
  initials: string;
  body: string;
  time: string;
};

export type Concern = {
  id: string;
  subject: string;
  category: ConcernCategory;
  status: ConcernStatus;
  submittedAt: string;
  updatedAt: string;
  description: string;
  studentName: string;
  studentEmail: string;
  assignedTeam: PersonnelTeam;
  assignee: string | null;
  messages: ConcernMessage[];
  attachmentName: string | null;
};

export type LostFoundItem = {
  id: string;
  name: string;
  type: ItemType;
  category: LostFoundCategory;
  location: CampusLocation;
  date: string;
  status: ItemStatus;
  description: string;
  reporter: string;
  reporterEmail: string;
};

export type NotificationRecord = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  time: string;
  read: boolean;
  href: string | null;
};

export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: AccountStatus;
  campusId: string;
  joinedAt: string;
  lastActive: string;
};

export type Registration = {
  id: string;
  name: string;
  email: string;
  campusId: string;
  registeredAt: string;
  attendance: AttendanceLabel;
};

export type CampusIdRecord = {
  id: string;
  campusId: string;
  claimed: boolean;
  studentName: string | null;
  createdAt: string;
  lastUsed: string | null;
};

export type StudentProfile = {
  name: string;
  email: string;
  campusId: string;
  role: Role;
  programme: string;
  yearOfStudy: string;
  phone: string;
  joinedAt: string;
};

export type LabelledValue = {
  label: string;
  value: number;
};
