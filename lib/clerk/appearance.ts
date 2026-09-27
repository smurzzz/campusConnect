import type { ClerkProvider } from "@clerk/nextjs";

/** Appearance object accepted by `ClerkProvider` (see `app/layout.tsx`). */
type ClerkAppearance = NonNullable<
  React.ComponentProps<typeof ClerkProvider>["appearance"]
>;

/**
 * Shared Clerk theming so the hosted sign-in/sign-up surfaces match the
 * CampusConnect design tokens instead of hardcoding values per page.
 */
export const CLERK_APPEARANCE = {
  variables: {
    colorPrimary: "#3b5bdb",
    colorBackground: "#ffffff",
    colorForeground: "#1f2937",
    colorInput: "#ffffff",
    colorInputForeground: "#1f2937",
    colorMuted: "#f3f4f8",
    colorMutedForeground: "#6b7280",
    colorRing: "#3b5bdb",
    colorBorder: "#e3e6ef",
    colorPrimaryForeground: "#ffffff",
    colorSuccess: "#2f9e6f",
    colorWarning: "#c98a2b",
    colorDanger: "#dc2626",
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
    fontSize: "0.875rem",
    borderRadius: "0.5rem",
  },
  elements: {
    formButton: {
      textTransform: "none",
      fontWeight: 600,
    },
  },
} satisfies ClerkAppearance;
