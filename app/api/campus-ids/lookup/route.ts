import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createSupabaseAdminClient } from '@/lib/supabase-admin'

const lookupSchema = z.object({
  campusId: z
    .string()
    .trim()
    .min(1, 'Campus ID is required')
    .regex(/^CA\d{1,8}$/i, 'Campus ID must look like CA20240001')
    .transform((value) => value.toUpperCase()),
})

/**
 * Resolves a Campus ID to its account's email so sign-in can proceed through
 * Clerk with the resolved identifier (docs/02-ARCHITECTURE.md §4: Campus ID →
 * email → Clerk auth).
 *
 * Intentionally public: it runs before authentication by definition. The
 * response only ever carries the resolved email for a claimed ID that ALSO
 * already exists in `public.users` (i.e. the account can be signed into) —
 * never claim state, IDs, or row counts that would let a caller enumerate
 * accounts or unclaimed registrar IDs.
 */
export async function POST(request: Request) {
  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const parsed = lookupSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors.campusId?.[0] ?? 'Campus ID is invalid' },
        { status: 400 },
      )
    }

    const admin = createSupabaseAdminClient()

    const { data, error } = await admin
      .from('seeded_campus_ids')
      .select('claimed_by, users(email)')
      .eq('campus_id', parsed.data.campusId)
      .maybeSingle()

    if (error) {
      console.error('Campus ID lookup failed:', error)
      return NextResponse.json({ error: 'Could not look up that Campus ID' }, { status: 500 })
    }

    // Same response for every "cannot sign in with this" outcome so the
    // endpoint cannot be used to probe which seeded IDs exist.
    const email = data?.users?.email
    if (!email) {
      return NextResponse.json({ error: 'No account found with this Campus ID.' }, { status: 404 })
    }

    return NextResponse.json({ email })
  } catch (error) {
    console.error('Error looking up Campus ID:', error)
    return NextResponse.json({ error: 'Failed to look up Campus ID' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
