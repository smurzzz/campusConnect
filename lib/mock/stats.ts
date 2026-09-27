import { CONCERNS } from "@/lib/mock/concerns";
import { EVENTS } from "@/lib/mock/events";
import { LOST_FOUND_ITEMS } from "@/lib/mock/lost-found";
import { USERS } from "@/lib/mock/users";
import { countBy, percentOf, sumBy } from "@/lib/utils/collection";
import type { LabelledValue } from "@/types";

/**
 * Derived dashboard figures. Phase 2 keeps these deterministic (no randomness)
 * so demos and tests always show the same numbers.
 */

/** Six-week activity trend used by the admin chart. */
export const ACTIVITY_TREND: LabelledValue[] = [
  { label: "W1", value: 12 },
  { label: "W2", value: 18 },
  { label: "W3", value: 15 },
  { label: "W4", value: 24 },
  { label: "W5", value: 31 },
  { label: "W6", value: 28 },
];

export const MONTHLY_SIGNUPS: LabelledValue[] = [
  { label: "Apr", value: 180 },
  { label: "May", value: 220 },
  { label: "Jun", value: 96 },
  { label: "Jul", value: 74 },
  { label: "Aug", value: 310 },
  { label: "Sep", value: 268 },
];

export const CONCERN_CATEGORY_BREAKDOWN: LabelledValue[] = Object.entries(
  countBy(CONCERNS, (concern) => concern.category),
).map(([label, value]) => ({ label, value }));

export const LOST_FOUND_BREAKDOWN: LabelledValue[] = Object.entries(
  countBy(LOST_FOUND_ITEMS, (item) => item.type),
).map(([label, value]) => ({ label, value }));

export const CONCERN_STATUS_BREAKDOWN: LabelledValue[] = Object.entries(
  countBy(CONCERNS, (concern) => concern.status),
).map(([label, value]) => ({ label, value }));

export const ADMIN_STATS = [
  { label: "Registered users", value: USERS.length.toLocaleString(), hint: "+12% vs last month" },
  {
    label: "Open concerns",
    value: CONCERNS.filter((concern) => concern.status !== "Resolved").length.toString(),
    hint: "2 marked urgent",
  },
  {
    label: "Published events",
    value: EVENTS.length.toString(),
    hint: `${sumBy(EVENTS, (event) => event.registered)} registrations`,
  },
  {
    label: "Open lost & found",
    value: LOST_FOUND_ITEMS.filter((item) => item.status === "Open").length.toString(),
    hint: "3 handed in this week",
  },
] as const;

export const STUDENT_STATS = [
  { label: "Registered events", value: "4", hint: "2 starting this week" },
  { label: "Open concerns", value: "2", hint: "1 awaiting your reply" },
  { label: "Unread updates", value: "3", hint: "Announcements and events" },
  { label: "Items found", value: "1", hint: "Keys handed in at West Hall" },
] as const;

export const PERSONNEL_STATS = [
  { label: "Assigned to me", value: "3", hint: "1 urgent" },
  { label: "Unassigned queue", value: "1", hint: "Facilities Team" },
  { label: "Resolved this month", value: "12", hint: "Average 1.4 days" },
  { label: "Open lost & found", value: "5", hint: "2 new since Monday" },
] as const;

/** Event capacity utilisation, highest first. */
export const EVENT_UTILISATION = EVENTS.map((event) => ({
  id: event.id,
  title: event.title,
  registered: event.registered,
  capacity: event.capacity,
  percent: percentOf(event.registered, event.capacity),
})).sort((a, b) => b.percent - a.percent);

export const RECENT_ACTIVITY = [
  {
    id: "act-1",
    title: "Maya Whitfield published “Fall orientation week schedule is live”",
    time: "2026-09-25T08:40:00",
  },
  {
    id: "act-2",
    title: "Jordan Pace moved “Broken projector in Bellhaven seminar rooms” to In Progress",
    time: "2026-09-24T14:02:00",
  },
  {
    id: "act-3",
    title: "Library help desk reported a found laptop",
    time: "2026-09-24T11:15:00",
  },
  {
    id: "act-4",
    title: "Tomas Beck changed Hana Sato to Personnel",
    time: "2026-09-23T16:30:00",
  },
] as const;
