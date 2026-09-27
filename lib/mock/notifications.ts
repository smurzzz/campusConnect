import type { NotificationRecord } from "@/types";

/** Seeded notification feed for the signed-in student. */
export const NOTIFICATIONS: NotificationRecord[] = [
  {
    id: "ntf-01",
    type: "concern",
    title: "Your concern was updated",
    body: "Dr Aisha Khan replied to “Conflicting exam timetable entries”.",
    time: "2026-09-26T09:06:00",
    read: false,
    href: "/concerns/con-104",
  },
  {
    id: "ntf-02",
    type: "event",
    title: "Careers fair reminder",
    body: "Careers fair: 40 employer partners starts in 12 days. Bring printed CVs.",
    time: "2026-09-25T17:30:00",
    read: false,
    href: "/events/evt-006",
  },
  {
    id: "ntf-03",
    type: "lost_found",
    title: "Possible match for your lost keys",
    body: "A bunch of keys with a red tag was handed in at West Hall.",
    time: "2026-09-23T12:10:00",
    read: false,
    href: "/lost-found/lf-202",
  },
  {
    id: "ntf-04",
    type: "announcement",
    title: "Library hours extended",
    body: "Ashby Library stays open until 02:00 on weekdays from 5 October.",
    time: "2026-09-24T08:00:00",
    read: true,
    href: "/announcements/ann-002",
  },
  {
    id: "ntf-05",
    type: "event",
    title: "Registration confirmed",
    body: "You are registered for Welcome lecture: Climate Futures 2026.",
    time: "2026-09-20T11:20:00",
    read: true,
    href: "/events/evt-001",
  },
  {
    id: "ntf-06",
    type: "system",
    title: "Bursary payment released",
    body: "Your emergency grant was released and should arrive within one working day.",
    time: "2026-09-11T15:46:00",
    read: true,
    href: "/profile",
  },
];
