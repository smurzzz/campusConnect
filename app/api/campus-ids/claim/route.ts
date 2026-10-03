import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'

import { createSupabaseAdminClient } from '@/lib/supabase-admin'

const claimSchema = z.object({
  campusId: z
    .string()
    .trim()
    .min(1, 'Campus ID is required')
    .regex(/^CA\d{1,8}$/i, 'Campus ID must look like CA20240001')
    .transform((value) => value.toUpperCase()),
})

/**
 * Claims a seeded Campus ID on behalf of the signed-in user.
 *
 * RLS is the enforcement layer here: the "claim your own" policy only allows
 * an UPDATE whose `claimed_by` equals the caller's Clerk id (`auth.jwt() ->
 * 'sub'`), so a user can never take a row someone else already claimed — the
 * database refuses it regardless of what this handler does.
 */
export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const parsed = claimSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors.campusId?.[0] ?? 'Campus ID is invalid' },
        { status: 400 },
      )
    }

    const admin = createSupabaseAdminClient()

    const { data: existing, error: lookupError } = await admin
      .from('seeded_campus_ids')
      .select('campus_id, is_claimed, claimed_by')
      .eq('campus_id', parsed.data.campusId)
      .maybeSingle()

    if (lookupError) {
      console.error('Campus ID lookup failed:', lookupError)
      return NextResponse.json({ error: 'Could not verify that Campus ID' }, { status: 500 })
    }

    // The signup form validates the format against the app's pattern, but a
    // typed-in value may simply not exist in the registrar's list.
    if (!existing) {
      return NextResponse.json(
        { error: 'This Campus ID isn\'t recognized. Please check with the registrar.' },
        { status: 404 },
      )
    }

    if (existing.claimed_by === userId) {
      // Already theirs — idempotent re-claim after a retry or a double-submit.
      return NextResponse.json({ campusId: existing.campus_id, alreadyClaimedByYou: true })
    }

    if (existing.is_claimed) {
      return NextResponse.json(
        { error: 'This Campus ID has already been registered.' },
        { status: 409 },
      )
    }

    const { data, error } = await admin
      .from('seeded_campus_ids')
      .update({ is_claimed: true, claimed_by: userId })
      .eq('campus_id', parsed.data.campusId)
      .is('claimed_by', null)
      .select('campus_id')
      .single()

    if (error || !data) {
      // The conditional update returning no row means someone claimed it
      // between the check and the write; a genuine error is logged separately.
      if (error) console.error('Campus ID claim failed:', error)
      return NextResponse.json(
        { error: 'This Campus ID has already been registered.' },
        { status: 409 },
      )
    }

    return NextResponse.json({ campusId: data.campus_id })
  } catch (error) {
    console.error('Error claiming Campus ID:', error)
    return NextResponse.json({ error: 'Failed to claim Campus ID' }, { status: 500 })
  }
}
