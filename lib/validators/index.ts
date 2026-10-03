import { z } from "zod";

import { ACCEPTED_UPLOAD_TYPES, MAX_UPLOAD_BYTES } from "@/lib/constants/app";
import {
  ANNOUNCEMENT_AUDIENCES,
  ANNOUNCEMENT_CATEGORIES,
  CAMPUS_LOCATIONS,
  CONCERN_CATEGORIES,
  EVENT_CATEGORIES,
  LOST_FOUND_CATEGORIES,
} from "@/lib/constants/categories";
import { ROLES } from "@/lib/constants/roles";
import { ACCOUNT_STATUS_VALUES } from "@/lib/constants/statuses";

const campusIdPattern = /^CA\d{1,8}$/i;

const email = z
  .string()
  .min(1, "Email is required")
  .max(120, "Email is too long")
  .email("Enter a valid email address");

const password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be 72 characters or fewer");

const campusId = z
  .string()
  .trim()
  .min(1, "Campus ID is required")
  .regex(campusIdPattern, "Campus ID must look like CA20240001")
  .transform((value) => value.toUpperCase());

const optionalAttachment = z
  .custom<FileList>((value) => value instanceof FileList, { message: "Attachment is invalid" })
  .refine(
    (files) => files.length === 0 || files.length === 1,
    "Attach a single file only",
  )
  .refine(
    (files) =>
      files.length === 0 ||
      ACCEPTED_UPLOAD_TYPES.includes(files[0].type as (typeof ACCEPTED_UPLOAD_TYPES)[number]),
    "Unsupported file type (PNG, JPG, WEBP or PDF)",
  )
  .refine(
    (files) => files.length === 0 || files[0].size <= MAX_UPLOAD_BYTES,
    "File must be 10 MB or smaller",
  )
  .optional();

const description = z
  .string()
  .trim()
  .min(20, "Please provide at least 20 characters")
  .max(2000, "Please keep this under 2000 characters");

const title = z.string().trim().min(4, "Title must be at least 4 characters").max(120);
const subject = z.string().trim().min(4, "Subject must be at least 4 characters").max(120);

const dateTime = z.string().min(1, "Date and time are required");

/** Sign-in / sign-up (Clerk handles the actual credential exchange). */
export const signInSchema = z.object({
  email,
  password,
});

export const signUpSchema = z
  .object({
    firstName: z.string().trim().min(2, "Enter your first name").max(50),
    lastName: z.string().trim().min(2, "Enter your last name").max(50),
    email,
    campusId,
    password,
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, { error: "You must accept the terms to continue" }),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({ email });

/** Student concern submission. */
export const concernSchema = z.object({
  subject,
  category: z.enum(CONCERN_CATEGORIES, { message: "Choose a category" }),
  description,
  attachment: optionalAttachment,
});

/** Staff/admin reply inside a concern thread. */
export const concernReplySchema = z.object({
  reply: z.string().trim().min(2, "Write a reply").max(1000, "Keep replies under 1000 characters"),
});

/** Lost and found report. */
export const lostFoundSchema = z.object({
  name: z.string().trim().min(2, "Describe the item").max(80),
  type: z.enum(["Lost", "Found"], { message: "Choose Lost or Found" }),
  category: z.enum(LOST_FOUND_CATEGORIES, { message: "Choose a category" }),
  location: z.enum(CAMPUS_LOCATIONS, { message: "Choose a location" }),
  date: z.string().min(1, "Date is required"),
  description: z.string().trim().min(10, "Add a short description").max(500),
  attachment: optionalAttachment,
});

/** Admin content creation. */
export const announcementSchema = z.object({
  title,
  category: z.enum(ANNOUNCEMENT_CATEGORIES, { message: "Choose a category" }),
  audience: z.enum(ANNOUNCEMENT_AUDIENCES, { message: "Choose an audience" }),
  status: z.enum(["Published", "Draft"]),
  body: description,
});

export const eventSchema = z.object({
  title,
  category: z.enum(EVENT_CATEGORIES, { message: "Choose a category" }),
  location: z.enum(CAMPUS_LOCATIONS, { message: "Choose a location" }),
  start: dateTime,
  end: dateTime,
  capacity: z
    .number({ message: "Capacity must be a number" })
    .int("Capacity must be a whole number")
    .min(1, "Capacity must be at least 1")
    .max(5000, "Capacity must be 5000 or less"),
  description,
});

/** Profile + admin user management. */
export const profileSchema = z.object({
  firstName: z.string().trim().min(2, "Enter your first name").max(50),
  lastName: z.string().trim().min(2, "Enter your last name").max(50),
  phone: z
    .string()
    .trim()
    .min(7, "Enter a valid phone number")
    .max(24, "Enter a valid phone number"),
  programme: z.string().trim().min(2, "Enter your programme").max(80),
  yearOfStudy: z.string().trim().min(1, "Choose your year").max(40),
});

export const userFormSchema = z.object({
  name: z.string().trim().min(3, "Enter the user's full name").max(80),
  email,
  role: z.enum(ROLES, { message: "Choose a role" }),
  status: z.enum(ACCOUNT_STATUS_VALUES, { message: "Choose a status" }),
});

export const campusIdSchema = z.object({
  campusId,
  owner: z.string().trim().max(80).optional(),
});

/** Derived types keep form wiring typed end to end. */
export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ConcernValues = z.infer<typeof concernSchema>;
export type ConcernReplyValues = z.infer<typeof concernReplySchema>;
export type LostFoundValues = z.infer<typeof lostFoundSchema>;
export type AnnouncementValues = z.infer<typeof announcementSchema>;
export type EventValues = z.infer<typeof eventSchema>;
export type ProfileValues = z.infer<typeof profileSchema>;
export type UserFormValues = z.infer<typeof userFormSchema>;
export type CampusIdValues = z.infer<typeof campusIdSchema>;
