import type { Metadata } from "next";

import { AuthForgotPassword } from "@/app/(auth)/auth-client";

export const metadata: Metadata = {
  title: "Reset password — CampusConnect",
  description: "Reset your CampusConnect password.",
};

export default function ForgotPasswordPage() {
  return <AuthForgotPassword />;
}
