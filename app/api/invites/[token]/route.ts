import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { hashToken } from '@/lib/api-auth'

// GET: Validate token and return invitation info
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const hashedToken = hashToken(token)

    const invitation = await db.invitation.findUnique({
      where: { token: hashedToken },
      include: {
        household: { select: { name: true } },
      },
    })

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invalid invitation' },
        { status: 404 }
      )
    }

    if (invitation.status !== 'PENDING') {
      const message =
        invitation.status === 'ACCEPTED'
          ? 'This invitation has already been accepted'
          : invitation.status === 'REVOKED'
            ? 'This invitation has been revoked'
            : 'This invitation has expired'

      return NextResponse.json({ error: message }, { status: 400 })
    }

    if (invitation.expiresAt < new Date()) {
      // Auto-update status to expired
      await db.invitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      })
      return NextResponse.json(
        { error: 'This invitation has expired' },
        { status: 400 }
      )
    }

    // Check if user already has an account
    const existingUser = await db.user.findUnique({
      where: { email: invitation.email },
    })

    return NextResponse.json({
      email: invitation.email,
      householdName: invitation.household.name,
      inviterName: invitation.inviterName,
      role: invitation.role,
      hasExistingAccount: !!existingUser,
      existingUserHasHousehold: !!existingUser?.householdId,
    })
  } catch (error) {
    console.error('Error validating invitation:', error)
    return NextResponse.json(
      { error: 'Invalid invitation' },
      { status: 500 }
    )
  }
}

// POST: Accept invitation (creates/links account)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const hashedToken = hashToken(token)
    const body = await request.json()
    const { name, password } = body

    const invitation = await db.invitation.findUnique({
      where: { token: hashedToken },
      include: { household: true },
    })

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invalid invitation' },
        { status: 400 }
      )
    }

    if (invitation.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'This invitation is no longer valid' },
        { status: 400 }
      )
    }

    if (invitation.expiresAt < new Date()) {
      await db.invitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      })
      return NextResponse.json(
        { error: 'This invitation has expired' },
        { status: 400 }
      )
    }

    // Check if email already has account
    const existingUser = await db.user.findUnique({
      where: { email: invitation.email },
    })

    // If user exists and is in a different household, reject
    if (
      existingUser &&
      existingUser.householdId &&
      existingUser.householdId !== invitation.householdId
    ) {
      return NextResponse.json(
        { error: 'You are already a member of a different household' },
        { status: 400 }
      )
    }

    // If creating new account, require name and password
    if (!existingUser && (!name || !password)) {
      return NextResponse.json(
        { error: 'Name and password are required to create an account' },
        { status: 400 }
      )
    }

    if (!existingUser && password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    const result = await db.$transaction(async (tx) => {
      let user

      if (existingUser) {
        // Link existing user to household
        user = await tx.user.update({
          where: { id: existingUser.id },
          data: { householdId: invitation.householdId },
        })
      } else {
        // Create new user
        const hashedPassword = await bcrypt.hash(password, 12)

        user = await tx.user.create({
          data: {
            email: invitation.email,
            name,
            hashedPassword,
            householdId: invitation.householdId,
          },
        })
      }

      // Create FamilyMember profile linked to User
      const familyMember = await tx.familyMember.create({
        data: {
          name: name || existingUser?.name || invitation.email.split('@')[0],
          role: invitation.role,
          householdId: invitation.householdId,
          userId: user.id,
        },
      })

      // Mark invitation as accepted
      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED', acceptedAt: new Date() },
      })

      return { user, familyMember }
    })

    return NextResponse.json({
      success: true,
      userId: result.user.id,
      householdId: invitation.householdId,
      isNewAccount: !existingUser,
    })
  } catch (error) {
    console.error('Error accepting invitation:', error)
    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    )
  }
}
