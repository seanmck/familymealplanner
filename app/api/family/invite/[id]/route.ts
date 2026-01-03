import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { hashToken } from '@/lib/api-auth'
import { sendInviteEmail } from '@/lib/email'

// DELETE: Revoke an invitation
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const invitation = await db.invitation.findFirst({
      where: { id, householdId: session.user.householdId },
    })

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }

    await db.invitation.update({
      where: { id },
      data: { status: 'REVOKED' },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error revoking invitation:', error)
    return NextResponse.json(
      { error: 'Failed to revoke invitation' },
      { status: 500 }
    )
  }
}

// POST: Resend an invitation (generates new token and extends expiry)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const invitation = await db.invitation.findFirst({
      where: { id, householdId: session.user.householdId },
      include: { household: true },
    })

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }

    if (invitation.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Can only resend pending invitations' },
        { status: 400 }
      )
    }

    // Get inviter info
    const inviter = await db.user.findUnique({
      where: { id: session.user.id },
    })

    // Generate new token
    const rawToken = randomBytes(32).toString('hex')
    const hashedToken = hashToken(rawToken)

    // Update invitation with new token and extended expiry
    await db.invitation.update({
      where: { id },
      data: {
        token: hashedToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        inviterName: inviter?.name || inviter?.email || 'A family member',
        invitedById: session.user.id,
      },
    })

    // Send email
    await sendInviteEmail({
      to: invitation.email,
      inviterName: inviter?.name || 'A family member',
      householdName: invitation.household.name,
      inviteToken: rawToken,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error resending invitation:', error)
    return NextResponse.json(
      { error: 'Failed to resend invitation' },
      { status: 500 }
    )
  }
}
