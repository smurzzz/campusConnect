import 'server-only'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/supabase'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * Service-role client: bypasses RLS entirely.
 *
 * `server-only` matters here. The service role key can read and write every
 * table, including `public.users`, which has no INSERT or DELETE policy at all
 * (only `users_select_own` / `users_update_own`). Anything reaching for this
 * must therefore do its own authorisation first, because no database policy will
 * back it up.
 *
 * Do not use this for user-facing reads. Prefer the session-token client from
 * `createAuthedSupabaseClient` so RLS applies.
 *
 * This lives in its own module rather than `lib/supabase.ts` because that file
 * is imported by client components. The service role key is not inlined into
 * client bundles (it is not `NEXT_PUBLIC_`), but keeping it behind `server-only`
 * turns a copy-paste mistake into a build error instead of a silent
 * privilege escalation.
 */
export function createSupabaseAdminClient(): SupabaseClient<Database> {
  if (!supabaseServiceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set. It is required for server-side writes that bypass RLS.'
    )
  }

  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
