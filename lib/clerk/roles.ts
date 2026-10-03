import { auth, currentUser } from "@clerk/nextjs/server";

import { isRole, ROLES, type Role } from "@/lib/constants/roles";

/**
 * Server-side role resolution. The role is stored in Clerk `publicMetadata`
 * (written by the Phase 1 provisioning webhook) and mirrored into the session
 * token so the proxy can authorise without an extra API call.
 */
export async function getSessionRole(): Promise<Role | null> {
  const { sessionClaims } = await auth();
  return roleFromSessionClaims(sessionClaims);
}

/**
 * The role claim can appear under either key, depending on which session-token
 * template the Clerk instance is using:
 *
 * - `publicMetadata.role` — Clerk's stock template (what `useRole()` reads).
 * - `metadata.role` — the customized template this project shipped for the
 *   Supabase third-party auth integration, which surfaces the same object as
 *   top-level `metadata` (also what `public.jwt_role()` reads in RLS).
 *
 * Accepting both keeps the proxy and the admin API routes working on either
 * template; before this, a customized-template token made every `/admin/*`
 * navigation and role/status API call return 403 for a signed-in admin.
 */
export function roleFromSessionClaims(claims: unknown): Role | null {
  const bag = claims as {
    publicMetadata?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  } | null;
  const role = bag?.publicMetadata?.role ?? bag?.metadata?.role;
  return isRole(role) ? (role as Role) : null;
}

export type Viewer = {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  imageUrl: string;
  role: Role;
  campusId: string | null;
};

/** Current signed-in user, or `null` for guests. Defaults to the student role. */
export async function getViewer(): Promise<Viewer | null> {
  const user = await currentUser();
  if (!user) return null;

  const role = isRole(user.publicMetadata.role) ? user.publicMetadata.role : ROLES.STUDENT;
  const campusId = user.publicMetadata.campusId;

  return {
    id: user.id,
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    name: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || "Member",
    email: user.primaryEmailAddress?.emailAddress ?? "",
    imageUrl: user.imageUrl,
    role,
    campusId: typeof campusId === "string" ? campusId : null,
  };
}
