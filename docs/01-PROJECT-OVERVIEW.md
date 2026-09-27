# CampusConnect — Project Overview

## What This Is
CampusConnect is a web-based student services platform that centralizes campus announcements, events, student concerns, and lost-and-found reports into a single system. It replaces scattered communication across messaging groups and social media with one authenticated, role-based platform.

## Problem Statement
Students currently receive announcements, event info, and service updates through fragmented channels. This causes missed announcements, difficulty submitting concerns, and no visibility into request status. Administrators lack a centralized way to manage submissions and communicate with the student body.

## Goals
- Centralize campus communication (announcements, events)
- Give students a clear channel to submit and track concerns
- Provide a structured lost-and-found reporting system
- Give staff/admins tools to manage content, users, and respond to requests
- Deploy on a low-cost, secure, responsive platform

## Tech Stack
| Layer | Technology |
|---|---|
| Frontend | Next.js, Tailwind CSS |
| Auth | Clerk — email/password, Google OAuth, and a pre-seeded Campus ID login (roles: Student, Personnel, Admin, Guest) |
| Database | Supabase (PostgreSQL) |
| Storage | Supabase Storage (images: lost & found, avatars, event covers) |
| Realtime (optional) | Supabase Realtime (live notifications) |
| Email (optional) | Resend |
| Hosting | Vercel |
| Domain | campusconnectph.site |

## Roles & Access
| Role | Access |
|---|---|
| **Guest** | View public announcements, events, lost & found (read-only, no submission) |
| **Student** | Full self-service: submit concerns, register for events, report lost/found items, manage own profile |
| **Personnel** | Review and respond to concerns, manage lost & found status |
| **Admin** | Full control: manage announcements, events, users, roles, view reports/analytics |

## Core Modules
1. Authentication & Role Management
2. Announcements
3. Events (with registration)
4. Student Concerns (with status tracking + threaded replies)
5. Lost & Found
6. Notifications
7. Admin Dashboard & Reports
8. User Management

## Out of Scope
- Online payment processing
- Official grading system
- Attendance monitoring
- Online examinations
- Integration with the school's existing student database
- Biometric device integration
- Native mobile app (web is fully responsive instead)

## Screen Count
38 screens/states across Guest (9), Student (14), Personnel (4), and Admin (9), plus shared system states (404, Access Denied). See `08-FUNCTIONALITY-PROMPT.md` for the full screen-by-screen functional breakdown.

## Success Criteria
- All core modules functional end-to-end (submit → track → resolve)
- Role-based access enforced at both UI and database level (RLS)
- Fully responsive (mobile, tablet, desktop)
- No hardcoded values — all config, copy, and environment-specific values externalized
- Deployed live with working auth, database, and storage
