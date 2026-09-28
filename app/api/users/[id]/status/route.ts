import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { ROLES } from '@/lib/constants/roles'
import { getSessionRole } from '@/lib/clerk/roles'

const STATUSES = ['active', 'deactivated'] as const
type UserStatus = (typeof STATUSES)[number]

/**
 * Activates or deactivates a user.
 *
 * This replaces the `activateUser`/`deactivateUser` server actions, which were
 * callable by any signed-in user and had no authorisation check.
 *
 * The status is a soft flag on `public.users`. It does not block Clerk sign-in;
 * that would require Clerk's ban or session-revocation APIs.
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

    // Service-role client: `public.users` has no admin UPDATE policy, only
    // `users_update_own`, so an RLS-checked write would match zero rows. The
    // admin check above is the authorisation for this write.
    const { data, error } = await createSupabaseAdminClient()
      .from('users')
      .update({ status: status as UserStatus })
      .eq('id', targetId)
      .select('id, status')
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, user: data })
  } catch (error) {
    console.error('Error updating user status:', error)
    return NextResponse.json(
      { error: 'Failed to update user status' },
      { status: 500 }
    )
  }
}
