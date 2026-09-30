import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

/**
 * Clerk returns the browser here after the OAuth handshake so the client-side
 * session can be finalised, then continues to the `redirectUrlComplete` path
 * the sign-in/sign-up component requested (see `useGoogleAuth`).
 */
export default function SsoCallbackPage() {
  return <AuthenticateWithRedirectCallback />;
}
