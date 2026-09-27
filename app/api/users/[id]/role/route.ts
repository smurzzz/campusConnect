import { NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId, role } = await request.json()

    // Update the user's publicMetadata in Clerk
    const clerkResponse = await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: {
        role: role
      }
    })

    return NextResponse.json({ success: true, user: clerkResponse })
  } catch (error) {
    console.error('Error updating user role in Clerk:', error)
    return NextResponse.json(
      { error: 'Failed to update user role' },
      { status: 500 }
    )
  }
}