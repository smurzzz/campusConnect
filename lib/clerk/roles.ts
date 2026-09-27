import { auth, currentUser } from "@clerk/nextjs/server";

import { isRole, ROLES, type Role } from "@/lib/constants/roles";

/**
 * Server-side role resolution. The role is stored in Clerk `publicMetadata`
 * (written by the Phase 1 provisioning webhook) and mirrored into the session
 * token so the proxy can authorise without an extra API call.
 */
export async function getSessionRole(): Promise<Role | null> {
  const { sessionClaims } = await auth();
  const role = publicMetadataOf(sessionClaims)?.role;
  return isRole(role) ? role : null;
}

type PublicClaims = { publicMetadata?: Record<string, unknown> } | null | undefined;

/** Clerk types the custom claim loosely; narrow it once, here. */
function publicMetadataOf(claims: unknown): Record<string, unknown> | undefined {
  return (claims as PublicClaims)?.publicMetadata;
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
