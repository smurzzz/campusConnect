import { NextResponse } from 'next/server'
import { clerkClient, auth } from '@clerk/nextjs/server'

import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { ROLES, isRole } from '@/lib/constants/roles'
import { getSessionRole } from '@/lib/clerk/roles'

/**
 * Updates a user's Clerk `publicMetadata.role`, which is what every RLS policy
 * and `useRole()` read.
 *
 * `clerkClient` is a factory (`() => Promise<ClerkClient>`) in Clerk v7, so it
 * has to be awaited before reaching `.users`.
 *
 * Authorisation: only an admin may change roles. The caller is checked before
 * any body parsing is trusted, otherwise any signed-in user could promote
 * themselves to admin. The role is read from the signed session token, never
 * from the request body or a client-supplied header.
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

    const { userId, role } = await request.json()
    const { id: targetId } = await params

    // The route param is the source of truth; ignore any body-supplied id so a
    // caller cannot write to a different account than the URL names.
    if (userId !== targetId) {
      return NextResponse.json({ error: 'userId does not match the route id' }, { status: 400 })
    }

    if (!isRole(role)) {
      return NextResponse.json(
        { error: `role must be one of: ${Object.values(ROLES).join(', ')}` },
        { status: 400 }
      )
    }

    const client = await clerkClient()
    const updatedUser = await client.users.updateUserMetadata(targetId, {
      publicMetadata: { role },
    })

    // Mirror the role into `public.users` so Supabase-side consumers (report
    // joins, personnel directories) agree with Clerk. Service role is used
    // because `users` has no admin UPDATE policy; the admin check above is
    // the authorisation for this write.
    const { error: syncError } = await createSupabaseAdminClient()
      .from('users')
      .update({ role })
      .eq('id', targetId)

    if (syncError) {
      // The Clerk change already happened; report partial success rather
      // than leaving the caller unsure whether to retry.
      console.error('Clerk role updated but Supabase sync failed:', syncError)
      return NextResponse.json(
        { success: true, userId: updatedUser.id, role, supabaseSynced: false },
        { status: 207 },
      )
    }

    return NextResponse.json({ success: true, userId: updatedUser.id, role, supabaseSynced: true })
  } catch (error) {
    console.error('Error updating user role in Clerk:', error)
    return NextResponse.json(
      { error: 'Failed to update user role' },
      { status: 500 }
    )
  }
}
