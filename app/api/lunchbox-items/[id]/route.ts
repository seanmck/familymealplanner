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
    const { category, name, notes, sortOrder, wasConsumed, consumptionNote } = body

    // Verify lunchbox item belongs to household
    const existing = await db.lunchboxItem.findFirst({
      where: { id },
      include: {
        mealPlan: true,
      },
    })

    if (!existing || existing.mealPlan.householdId !== session.user.householdId) {
      return NextResponse.json(
        { error: 'Lunchbox item not found' },
        { status: 404 }
      )
    }

    const lunchboxItem = await db.lunchboxItem.update({
      where: { id },
      data: {
        category: category ?? existing.category,
        name: name ?? existing.name,
        notes: notes !== undefined ? notes : existing.notes,
        sortOrder: sortOrder ?? existing.sortOrder,
        wasConsumed: wasConsumed !== undefined ? wasConsumed : existing.wasConsumed,
        consumptionNote: consumptionNote !== undefined ? consumptionNote : existing.consumptionNote,
      },
      include: {
        familyMember: true,
      },
    })

    return NextResponse.json(lunchboxItem)
  } catch (error) {
    console.error('Error updating lunchbox item:', error)
    return NextResponse.json(
      { error: 'Failed to update lunchbox item' },
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

    // Verify lunchbox item belongs to household
    const lunchboxItem = await db.lunchboxItem.findFirst({
      where: { id },
      include: {
        mealPlan: true,
      },
    })

    if (!lunchboxItem || lunchboxItem.mealPlan.householdId !== session.user.householdId) {
      return NextResponse.json(
        { error: 'Lunchbox item not found' },
        { status: 404 }
      )
    }

    await db.lunchboxItem.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting lunchbox item:', error)
    return NextResponse.json(
      { error: 'Failed to delete lunchbox item' },
      { status: 500 }
    )
  }
}
