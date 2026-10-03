import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createSupabaseAdminClient } from '@/lib/supabase-admin'

const checkSchema = z.object({
  campusId: z
    .string()
    .trim()
    .min(1, 'Campus ID is required')
    .regex(/^CA\d{1,8}$/i, 'Campus ID must look like CA20240001')
    .transform((value) => value.toUpperCase()),
})

/**
 * Signup pre-check: does this seeded Campus ID exist, and is it still
 * unclaimed? The signup form calls it BEFORE creating the Clerk account so
 * the spec's inline errors ("isn't recognized" / "already been registered")
 * surface at the form instead of after email verification. The claim route
 * (`/api/campus-ids/claim`) stays the race-safe enforcement layer — this is
 * UX only, never the security boundary.
 *
 * Intentionally public (pre-auth by definition). It reveals only claim state
 * for a *typed* ID — the same information the post-verification claim errors
 * already disclose — never row counts, account emails, or claimant ids.
 */
export async function POST(request: Request) {
  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const parsed = checkSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors.campusId?.[0] ?? 'Campus ID is invalid' },
        { status: 400 },
      )
    }

    const admin = createSupabaseAdminClient()

    const { data, error } = await admin
      .from('seeded_campus_ids')
      .select('is_claimed')
      .eq('campus_id', parsed.data.campusId)
      .maybeSingle()

    if (error) {
      console.error('Campus ID check failed:', error)
      return NextResponse.json({ error: 'Could not check that Campus ID' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json(
        { error: "This Campus ID isn't recognized. Please check with the registrar." },
        { status: 404 },
      )
    }

    if (data.is_claimed) {
      return NextResponse.json(
        { error: 'This Campus ID has already been registered.' },
        { status: 409 },
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error checking Campus ID:', error)
    return NextResponse.json({ error: 'Failed to check Campus ID' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
