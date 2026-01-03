import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { hashToken } from '@/lib/api-auth'
import { sendInviteEmail } from '@/lib/email'

// POST: Send a new invitation
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { email, role = 'ADULT' } = body

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      )
    }

    if (role !== 'ADULT' && role !== 'CHILD') {
      return NextResponse.json(
        { error: 'Role must be ADULT or CHILD' },
        { status: 400 }
      )
    }

    // Check if user already exists in this household
    const existingUser = await db.user.findFirst({
      where: {
        email: email.toLowerCase(),
        householdId: session.user.householdId,
      },
    })
    if (existingUser) {
      return NextResponse.json(
        { error: 'This user is already a member of your household' },
        { status: 400 }
      )
    }

    // Check for pending invite to same email
    const existingInvite = await db.invitation.findFirst({
      where: {
        email: email.toLowerCase(),
        householdId: session.user.householdId,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
    })
    if (existingInvite) {
      return NextResponse.json(
        { error: 'An invitation has already been sent to this email' },
        { status: 400 }
      )
    }

    // Get inviter and household info
    const [inviter, household] = await Promise.all([
      db.user.findUnique({ where: { id: session.user.id } }),
      db.household.findUnique({ where: { id: session.user.householdId } }),
    ])

    if (!household) {
      return NextResponse.json(
        { error: 'Household not found' },
        { status: 404 }
      )
    }

    // Generate secure token (raw token for email, hashed for storage)
    const rawToken = randomBytes(32).toString('hex')
    const hashedToken = hashToken(rawToken)

    // Create invitation
    const invitation = await db.invitation.create({
      data: {
        email: email.toLowerCase(),
        token: hashedToken,
        role,
        inviterName: inviter?.name || inviter?.email || 'A family member',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        householdId: session.user.householdId,
        invitedById: session.user.id,
      },
    })

    // Send email
    await sendInviteEmail({
      to: email.toLowerCase(),
      inviterName: inviter?.name || 'A family member',
      householdName: household.name,
      inviteToken: rawToken, // Raw token in email URL
    })

    return NextResponse.json(
      {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating invitation:', error)
    return NextResponse.json(
      { error: 'Failed to send invitation' },
      { status: 500 }
    )
  }
}

// GET: List pending invitations for the household
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const invitations = await db.invitation.findMany({
      where: { householdId: session.user.householdId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        expiresAt: true,
        createdAt: true,
        invitedBy: { select: { name: true, email: true } },
      },
    })

    return NextResponse.json(invitations)
  } catch (error) {
    console.error('Error fetching invitations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invitations' },
      { status: 500 }
    )
  }
}
