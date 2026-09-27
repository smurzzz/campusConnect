/** Roles stored in Clerk `publicMetadata.role`. */
export const ROLES = {
  STUDENT: "student",
  PERSONNEL: "personnel",
  ADMIN: "admin",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ASSIGNABLE_ROLES: Role[] = [ROLES.STUDENT, ROLES.PERSONNEL, ROLES.ADMIN];

export const ROLE_LABELS: Record<Role, string> = {
  [ROLES.STUDENT]: "Student",
  [ROLES.PERSONNEL]: "Personnel",
  [ROLES.ADMIN]: "Admin",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  [ROLES.STUDENT]: "Browse campus life, register for events, and raise concerns.",
  [ROLES.PERSONNEL]: "Respond to student concerns and manage lost and found items.",
  [ROLES.ADMIN]: "Full oversight of content, users, and campus analytics.",
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ASSIGNABLE_ROLES as string[]).includes(value);
}

/** Personnel and admins may sign in to the admin console. */
export function isStaffRole(role: Role | null | undefined): boolean {
  return role === ROLES.PERSONNEL || role === ROLES.ADMIN;
}
