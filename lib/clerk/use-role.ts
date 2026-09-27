"use client";

import { useUser } from "@clerk/nextjs";

import { isRole, ROLES, type Role } from "@/lib/constants/roles";

/**
 * Client-side role for navigation rendering. Reads the same Clerk
 * `publicMetadata.role` the server trusts, so shells never hardcode roles.
 */
export function useRole(): Role {
  const { user } = useUser();
  const role = user?.publicMetadata?.role;
  return isRole(role) ? role : ROLES.STUDENT;
}

export function useViewerName(): string {
  const { user, isLoaded } = useUser();
  if (!isLoaded) return "";
  if (!user) return "";
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
  return fullName || user.username || "Member";
}
