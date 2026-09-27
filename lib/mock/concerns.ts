import type { Concern } from "@/types";

/** Seeded concerns. One entry mirrors the signed-in student (Alex Morgan). */
export const CONCERNS: Concern[] = [
  {
    id: "con-101",
    subject: "Broken projector in Bellhaven seminar rooms",
    category: "Facility",
    status: "In Progress",
    submittedAt: "2026-09-22T10:15:00",
    updatedAt: "2026-09-24T14:02:00",
    description:
      "The projector in Bellhaven 2.14 no longer powers on, so Thursday's research methods seminar has no visuals. The room booking shows 60 expected attendees.",
    studentName: "Maya Ellis",
    studentEmail: "maya.ellis@campusconnect.app",
    assignedTeam: "Facilities Team",
    assignee: "Jordan Pace",
    messages: [
      {
        id: "msg-1",
        author: "Maya Ellis",
        role: "student",
        initials: "ME",
        body: "Reported at the help desk as well — they confirmed an engineer is needed.",
        time: "2026-09-22T10:20:00",
      },
      {
        id: "msg-2",
        author: "Jordan Pace",
        role: "staff",
        initials: "JP",
        body: "Thanks for the detail. A replacement unit is booked for Monday morning; I have flagged the room as out of service until then.",
        time: "2026-09-24T14:02:00",
      },
    ],
    attachmentName: "bellhaven-projector.jpg",
  },
  {
    id: "con-102",
    subject: "Module registration closed before the deadline",
    category: "Administrative",
    status: "Resolved",
    submittedAt: "2026-09-14T08:40:00",
    updatedAt: "2026-09-18T11:30:00",
    description:
      "My module options disappeared from the portal on the final day of the registration window, although I was within my catalogue year.",
    studentName: "Owen Reid",
    studentEmail: "owen.reid@campusconnect.app",
    assignedTeam: "Student Services",
    assignee: "Maya Whitfield",
    messages: [
      {
        id: "msg-1",
        author: "Owen Reid",
        role: "student",
        initials: "OR",
        body: "I have a screenshot of the portal error if that helps.",
        time: "2026-09-14T08:52:00",
      },
      {
        id: "msg-2",
        author: "Maya Whitfield",
        role: "staff",
        initials: "MW",
        body: "The portal error was caused by a stale session. Your registration is confirmed and your options are visible again.",
        time: "2026-09-18T11:30:00",
      },
    ],
    attachmentName: null,
  },
  {
    id: "con-103",
    subject: "Accessible lab bench needed in Maplewood",
    category: "Facility",
    status: "Pending",
    submittedAt: "2026-09-25T16:05:00",
    updatedAt: "2026-09-25T16:05:00",
    description:
      "The chemistry labs in Maplewood have knee-height benches, but none with power sockets, which I need for the spectrometer work in my dissertation.",
    studentName: "Alex Morgan",
    studentEmail: "alex.morgan@campusconnect.app",
    assignedTeam: "Facilities Team",
    assignee: null,
    messages: [],
    attachmentName: "maplewood-lab.jpg",
  },
  {
    id: "con-104",
    subject: "Conflicting exam timetable entries",
    category: "Academic",
    status: "Urgent",
    submittedAt: "2026-09-26T08:12:00",
    updatedAt: "2026-09-26T09:05:00",
    description:
      "Two of my exams are listed for the same morning in different halls. I have a placement appointment at one of the venues the same day.",
    studentName: "Priya Nand",
    studentEmail: "priya.nand@campusconnect.app",
    assignedTeam: "Academic Affairs",
    assignee: "Dr Aisha Khan",
    messages: [
      {
        id: "msg-1",
        author: "Priya Nand",
        role: "student",
        initials: "PN",
        body: "Both entries reference the same module code, so it looks like a timetable export error.",
        time: "2026-09-26T08:20:00",
      },
      {
        id: "msg-2",
        author: "Dr Aisha Khan",
        role: "staff",
        initials: "AK",
        body: "Escalating to the examinations office. You will keep your original hall unless they contact you.",
        time: "2026-09-26T09:05:00",
      },
    ],
    attachmentName: null,
  },
  {
    id: "con-105",
    subject: "Heating offline in Kingsley Hall block C",
    category: "Facility",
    status: "In Progress",
    submittedAt: "2026-09-20T19:30:00",
    updatedAt: "2026-09-23T08:15:00",
    description:
      "Heating in Kingsley block C has been off since Sunday evening. Corridor temperatures are around 11 degrees by morning.",
    studentName: "Sam Whitfield",
    studentEmail: "sam.whitfield@campusconnect.app",
    assignedTeam: "Facilities Team",
    assignee: "Jordan Pace",
    messages: [
      {
        id: "msg-1",
        author: "Jordan Pace",
        role: "staff",
        initials: "JP",
        body: "Engineer booked for the morning of the 23rd, portable heaters on the way to the block today.",
        time: "2026-09-23T08:15:00",
      },
    ],
    attachmentName: null,
  },
  {
    id: "con-106",
    subject: "Bursary payment delayed by over three weeks",
    category: "Administrative",
    status: "Resolved",
    submittedAt: "2026-09-02T11:00:00",
    updatedAt: "2026-09-11T15:45:00",
    description:
      "My bursary award letter was issued on 1 September but nothing has reached my account. Rent is due on the 15th.",
    studentName: "Lena Brooks",
    studentEmail: "lena.brooks@campusconnect.app",
    assignedTeam: "Student Services",
    assignee: "Elena Rossi",
    messages: [
      {
        id: "msg-1",
        author: "Elena Rossi",
        role: "staff",
        initials: "ER",
        body: "The finance system was in a batch failure for six days. Your payment was released on the 10th and should arrive tomorrow.",
        time: "2026-09-11T15:45:00",
      },
    ],
    attachmentName: "award-letter.pdf",
  },
];

/** Concerns raised by the signed-in mock student. */
export const MY_CONCERN_IDS = ["con-103", "con-104"];
export const MY_CONCERNS = CONCERNS.filter((concern) =>
  MY_CONCERN_IDS.includes(concern.id),
);
