import { NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'

import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { ROLES } from '@/lib/constants/roles'
import { getSessionRole } from '@/lib/clerk/roles'

const STATUSES = ['active', 'deactivated'] as const
type UserStatus = (typeof STATUSES)[number]

/**
 * Activates or deactivates a user.
 *
 * Deactivation bans the Clerk account (`ban()`), which blocks sign-in and
 * revokes existing sessions — the previous soft `public.users.status` flag
 * alone did not stop a deactivated user from logging back in. The flag is
 * still mirrored into `public.users.status` for Supabase-side reporting.
 *
 * Authorisation: only an admin may change account status, checked from the
 * signed session token before the body is trusted.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: callerId } = await auth()
    if (!callerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const callerRole = await getSessionRole()
    if (callerRole !== ROLES.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { userId, status } = await request.json()
    const { id: targetId } = await params

    // The route param is the source of truth; ignore any body-supplied id so a
    // caller cannot write to a different account than the URL names.
    if (userId !== targetId) {
      return NextResponse.json({ error: 'userId does not match the route id' }, { status: 400 })
    }

    if (!STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    // Guard rail: an admin cannot deactivate their own account and lock
    // every other admin out of user management.
    if (status === 'deactivated' && targetId === callerId) {
      return NextResponse.json(
        { error: 'You cannot deactivate your own account' },
        { status: 400 },
      )
    }

    const clerk = await clerkClient()

    if (status === 'deactivated') {
      await clerk.users.banUser(targetId)
    } else {
      await clerk.users.unbanUser(targetId)
    }

    // Mirror the soft flag for reporting. Service role is required because
    // `public.users` has no admin UPDATE policy (only `users_update_own`).
    const { data, error } = await createSupabaseAdminClient()
      .from('users')
      .update({ status: status as UserStatus })
      .eq('id', targetId)
      .select('id, status')
      .single()

    if (error) {
      console.error('Clerk ban state updated but Supabase sync failed:', error)
      return NextResponse.json(
        { success: true, user: { id: targetId, status }, supabaseSynced: false },
        { status: 207 },
      )
    }

    return NextResponse.json({ success: true, user: data, supabaseSynced: true })
  } catch (error) {
    console.error('Error updating user status:', error)
    return NextResponse.json(
      { error: 'Failed to update user status' },
      { status: 500 }
    )
  }
}
