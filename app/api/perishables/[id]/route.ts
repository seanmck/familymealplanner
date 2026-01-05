import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// DELETE - Remove a perishable item
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

    // Verify perishable belongs to household
    const perishable = await db.perishable.findFirst({
      where: {
        id,
        householdId: session.user.householdId,
      },
    })

    if (!perishable) {
      return NextResponse.json(
        { error: 'Perishable not found' },
        { status: 404 }
      )
    }

    await db.perishable.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting perishable:', error)
    return NextResponse.json(
      { error: 'Failed to delete perishable' },
      { status: 500 }
    )
  }
}

// PATCH - Update a perishable item
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const updates = await request.json()

    // Verify perishable belongs to household
    const perishable = await db.perishable.findFirst({
      where: {
        id,
        householdId: session.user.householdId,
      },
    })

    if (!perishable) {
      return NextResponse.json(
        { error: 'Perishable not found' },
        { status: 404 }
      )
    }

    const updated = await db.perishable.update({
      where: { id },
      data: {
        quantity: updates.quantity !== undefined
          ? (updates.quantity ? parseFloat(updates.quantity) : null)
          : undefined,
        unit: updates.unit !== undefined ? (updates.unit || null) : undefined,
        expirationDate: updates.expirationDate !== undefined
          ? (updates.expirationDate ? new Date(updates.expirationDate) : null)
          : undefined,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating perishable:', error)
    return NextResponse.json(
      { error: 'Failed to update perishable' },
      { status: 500 }
    )
  }
}
