import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, role } = body

    // Verify member belongs to household
    const existingMember = await db.familyMember.findFirst({
      where: {
        id,
        householdId: session.user.householdId,
      },
    })

    if (!existingMember) {
      return NextResponse.json(
        { error: 'Family member not found' },
        { status: 404 }
      )
    }

    const member = await db.familyMember.update({
      where: { id },
      data: { name, role },
    })

    return NextResponse.json(member)
  } catch (error) {
    console.error('Error updating family member:', error)
    return NextResponse.json(
      { error: 'Failed to update family member' },
      { status: 500 }
    )
  }
}

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

    // Verify member belongs to household
    const existingMember = await db.familyMember.findFirst({
      where: {
        id,
        householdId: session.user.householdId,
      },
    })

    if (!existingMember) {
      return NextResponse.json(
        { error: 'Family member not found' },
        { status: 404 }
      )
    }

    await db.familyMember.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting family member:', error)
    return NextResponse.json(
      { error: 'Failed to delete family member' },
      { status: 500 }
    )
  }
}
