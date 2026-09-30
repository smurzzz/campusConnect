import type { Announcement } from "@/types";

/**
 * Seeded announcements (Phase 2). Drafts stay unpublished until an admin
 * promotes them, mirroring the `publication_status` column planned for Phase 3.
 */
export const ANNOUNCEMENTS: Announcement[] = [
  {
    id: "ann-001",
    title: "Fall orientation week schedule is live",
    category: "Academic",
    date: "2026-09-25",
    excerpt:
      "Orientation runs from 24 to 30 September with daily workshops, campus tours and faculty drop-ins. Here is everything you need for your first week back.",
    body: [
      "Orientation week opens on Thursday 24 September at 09:00 in Dockside Union. Every new student receives a welcome pack containing the campus map, timetable template and IT access instructions.",
      "Daily workshops cover academic advising, library orientation, wellbeing services and financial aid. Each session repeats at 10:00 and 15:00 so you can fit them around your registration slot.",
      "Faculty drop-ins run from 12:00 to 14:00 in each faculty house. Bring your questions about module selection, prerequisites and the summer research scheme.",
      "Campus tours leave from the Student Union every hour and finish at the ICCT Sports Centre. Accessibility-friendly tours can be booked at the help desk.",
    ],
    status: "Published",
    audience: "Everyone",
    author: { name: "Maya Whitfield", role: "Registrar", initials: "MW" },
    readMinutes: 4,
  },
  {
    id: "ann-002",
    title: "Ashby Library extends opening hours through the exam period",
    category: "Facilities",
    date: "2026-09-24",
    excerpt:
      "From 5 October the library will stay open until 02:00 on weekdays, with 24-hour access on the lower floors all week.",
    body: [
      "Extended hours begin on Monday 5 October and run until the last examination on 18 December. The lower floors, group rooms and the 24-hour study zone stay open around the clock.",
      "Security staffing increases between 22:00 and 06:00, and the café on the ground floor will serve until 23:00 on weekdays.",
      "Booked group rooms remain available after 18:00. Overdue reminders are suspended for the duration of the extended period.",
    ],
    status: "Published",
    audience: "Students only",
    author: { name: "Daniel Okafor", role: "Head Librarian", initials: "DO" },
    readMinutes: 3,
  },
  {
    id: "ann-003",
    title: "Campus shuttle adds an evening loop from Monday",
    category: "Campus Life",
    date: "2026-09-22",
    excerpt:
      "The new evening loop runs every 20 minutes between 18:00 and 01:00, linking residences, the library and the sports centre.",
    body: [
      "The evening loop replaces the current limited service and adds three stops: Juniper Residences, the Innovation Lab and ICCT Sports Centre.",
      "Buses depart the Student Union every 20 minutes from 18:00 until 01:00. The service is included in the student transit pass, so no ticket is needed.",
      "Live departure boards are available in the mobile app and at each shelter. Accessibility ramps are fitted on both loop buses.",
    ],
    status: "Published",
    audience: "Everyone",
    author: { name: "Priya Raman", role: "Estates Manager", initials: "PR" },
    readMinutes: 2,
  },
  {
    id: "ann-004",
    title: "Financial aid applications close on 15 October",
    category: "Financial Aid",
    date: "2026-09-20",
    excerpt:
      "Bursaries, hardship funds and the emergency grant all need a complete application before the deadline. Drafts save automatically.",
    body: [
      "Applications for the main bursary package, the hardship fund and the emergency grant close at 23:59 on 15 October. Late applications are only considered in exceptional circumstances.",
      "Drafts save automatically, so you can gather references over several visits. A checklist shows exactly which documents are outstanding.",
      "Drop-in advising runs daily at 13:00 in the Student Services suite. Bring your student ID and last year's award letter if you have it.",
    ],
    status: "Published",
    audience: "Students only",
    author: { name: "Elena Rossi", role: "Financial Aid Lead", initials: "ER" },
    readMinutes: 3,
  },
  {
    id: "ann-005",
    title: "Scheduled power maintenance in Cedar Court",
    category: "Facilities",
    date: "2026-09-18",
    excerpt:
      "Cedar Court will lose power between 08:00 and 14:00 on 2 October. Labs, lifts and hot water will be unavailable during the window.",
    body: [
      "Engineers will replace the main distribution board in Cedar Court on 2 October between 08:00 and 14:00. Power, lifts, hot water and all laboratory equipment will be offline.",
      "Residence staff will hand out bottled water at the main entrance from 07:30. Students who need refrigeration for medical reasons should contact wellbeing in advance.",
      "Network and IT services are unaffected, so the library and online learning platforms stay available.",
    ],
    status: "Published",
    audience: "Everyone",
    author: { name: "Priya Raman", role: "Estates Manager", initials: "PR" },
    readMinutes: 2,
  },
  {
    id: "ann-006",
    title: "Night escort service now runs seven days a week",
    category: "Safety",
    date: "2026-09-15",
    excerpt:
      "Safety escorts are available from 20:00 to 04:00 every night. Book by phone or in the app and an officer will meet you at your building.",
    body: [
      "The night escort programme now operates seven days a week between 20:00 and 04:00. Requests made less than 15 minutes before collection may not be available.",
      "Book by calling the safety desk on 555-0188 or from the CampusConnect app. Officers walk or drive you to your destination on campus and to the main gates.",
      "The programme is free for all staff and students. Report incidents through the app so the safety office can follow up.",
    ],
    status: "Published",
    audience: "Everyone",
    author: { name: "Tomas Beck", role: "Safety Officer", initials: "TB" },
    readMinutes: 2,
  },
  {
    id: "ann-007",
    title: "Student union renovation reaches its halfway mark",
    category: "Campus Life",
    date: "2026-09-12",
    excerpt:
      "The new food court, society hub and quiet study rooms are on track to reopen before the winter break.",
    body: [
      "Construction on the Student Union is halfway complete. The new food court, society storage hub and quiet study rooms are all being built to the revised programme.",
      "Temporary food outlets remain in the courtyard until November. Society meetings continue in Founders Hall and the library seminar rooms.",
      "The reopened union will include accessible counters, gender-neutral facilities and a dedicated quiet floor.",
    ],
    status: "Published",
    audience: "Everyone",
    author: { name: "Lena Ortiz", role: "Communications Officer", initials: "LO" },
    readMinutes: 3,
  },
  {
    id: "ann-008",
    title: "Winter break timetable and shuttle plan (draft)",
    category: "Campus Life",
    date: "2026-09-26",
    excerpt:
      "Draft schedule for the December close-down, including the reduced shuttle timetable and library hours.",
    body: [
      "The campus closes on Friday 18 December and reopens on Monday 6 January. Residences stay open over the break with reduced catering.",
      "This draft is still being reviewed by estates and the transport team before publication.",
    ],
    status: "Draft",
    audience: "Everyone",
    author: { name: "Lena Ortiz", role: "Communications Officer", initials: "LO" },
    readMinutes: 2,
  },
  {
    id: "ann-009",
    title: "Undergraduate research grant info session (draft)",
    category: "Academic",
    date: "2026-09-27",
    excerpt:
      "Aimed at second and third year students applying to the summer research scheme. Dates to be confirmed.",
    body: [
      "The research office will host two information sessions covering eligibility, deadlines and how to write a competitive application.",
      "Session dates are still being confirmed with the department leads.",
    ],
    status: "Draft",
    audience: "Students only",
    author: { name: "Dr Aisha Khan", role: "Research Office", initials: "AK" },
    readMinutes: 2,
  },
];

export const PUBLISHED_ANNOUNCEMENTS = ANNOUNCEMENTS.filter(
  (announcement) => announcement.status === "Published",
);
