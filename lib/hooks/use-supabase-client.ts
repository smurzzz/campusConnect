"use client";

import { useMemo } from "react";
import { useAuth } from "@clerk/nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createAuthedSupabaseClient, type Database } from "@/lib/supabase";

/**
 * `useAuth().getToken()` throws `clerk_runtime_not_browser` when a client
 * component's render is replayed during SSR (Next 16 replays client renders
 * on the server for the initial HTML). We cannot prevent the replay, so the
 * callback is browser-gated: on the server it resolves to `null` and the
 * Supabase client falls back to the anon key instead of crashing.
 */
const isBrowser = typeof window !== "undefined";

/**
 * Supabase client bound to the Clerk session token, so RLS sees a real
 * `auth.uid()` (the Clerk id in the token's `sub` claim) and the `role`
 * claim from the session token's public metadata.
 *
 * Without it every policy gated on identity or role fails: the sessionless
 * anon client is seen as `anon`, `auth.jwt()` is NULL, and staff see no
 * concerns, users see none of their own registrations or notifications, and
 * all writes are refused.
 */
export function useSupabaseClient(): SupabaseClient<Database> {
  const { getToken, isLoaded } = useAuth();
  return useMemo(
    () => createAuthedSupabaseClient(async () => (isBrowser && isLoaded ? getToken() : null)),
    [getToken, isLoaded],
  );
}
