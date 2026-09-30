import type { Metadata } from "next";

import { AuthSignIn } from "@/app/(auth)/auth-client";

export const metadata: Metadata = {
  title: "Log in — CampusConnect",
  description: "Log in to your CampusConnect account.",
};

export default function LoginPage() {
  return <AuthSignIn />;
}
