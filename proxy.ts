import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

import { isRole, type Role } from "@/lib/constants/roles";
import { dashboardRouteForRole, loginRoute, ROLE_GUARDED_PREFIXES, ROUTES } from "@/lib/constants/routes";

/** Routes that always require a session (student, staff and admin areas). */
const SIGNED_IN_ROUTES = [
  ROUTES.DASHBOARD,
  ROUTES.CONCERNS,
  ROUTES.PROFILE,
  ROUTES.NOTIFICATIONS,
  ROUTES.MY_EVENTS,
  ROUTES.LOST_FOUND_NEW,
];

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isSignedInRoute(pathname: string): boolean {
  return SIGNED_IN_ROUTES.some((route) => matchesPrefix(pathname, route));
}

function requiredRoles(pathname: string): readonly Role[] | null {
  return ROLE_GUARDED_PREFIXES.find((route) => matchesPrefix(pathname, route.prefix))?.roles ?? null;
}

export default clerkMiddleware(async (auth, request: NextRequest) => {
  const pathname = request.nextUrl.pathname;

  // The marketing landing page is guest-only real estate: a signed-in member
  // clicking the logo would otherwise land on a page full of "Log in" buttons,
  // which reads exactly like being logged out. Send them to their portal.
  if (pathname === "/") {
    const { isAuthenticated, sessionClaims } = await auth();
    if (isAuthenticated) {
      const role = (sessionClaims as { publicMetadata?: { role?: unknown } } | null)
        ?.publicMetadata?.role;
      const dashboard = dashboardRouteForRole(isRole(role) ? role : null);
      return NextResponse.redirect(new URL(dashboard, request.url));
    }
    return NextResponse.next();
  }

  const required = requiredRoles(pathname);

  if (!required && !isSignedInRoute(pathname)) {
    return NextResponse.next();
  }

  const { isAuthenticated, sessionClaims } = await auth();

  // Signed-out visitors are sent to sign-in with a return path.
  if (!isAuthenticated) {
    const returnUrl = `${pathname}${request.nextUrl.search}`;
    return NextResponse.redirect(new URL(loginRoute(returnUrl), request.url));
  }

  if (required) {
    const role = (sessionClaims as { publicMetadata?: { role?: unknown } } | null)
      ?.publicMetadata?.role;
    if (!isRole(role) || !required.includes(role)) {
      return NextResponse.redirect(new URL(ROUTES.ACCESS_DENIED, request.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
