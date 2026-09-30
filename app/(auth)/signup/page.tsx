import type { Metadata } from "next";

import { AuthSignUp } from "@/app/(auth)/auth-client";

export const metadata: Metadata = {
  title: "Sign up — CampusConnect",
  description: "Create your CampusConnect account.",
};

export default function SignupPage() {
  return <AuthSignUp />;
}
