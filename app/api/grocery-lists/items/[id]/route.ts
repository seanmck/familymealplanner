import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// PATCH - Update a grocery item (e.g., check/uncheck)
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

    // Verify item belongs to household
    const item = await db.groceryItem.findFirst({
      where: {
        id,
        groceryList: {
          mealPlan: {
            householdId: session.user.householdId,
          },
        },
      },
    })

    if (!item) {
      return NextResponse.json(
        { error: 'Grocery item not found' },
        { status: 404 }
      )
    }

    const updatedItem = await db.groceryItem.update({
      where: { id },
      data: updates,
    })

    return NextResponse.json(updatedItem)
  } catch (error) {
    console.error('Error updating grocery item:', error)
    return NextResponse.json(
      { error: 'Failed to update grocery item' },
      { status: 500 }
    )
  }
}

// DELETE - Remove a grocery item
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

    // Verify item belongs to household
    const item = await db.groceryItem.findFirst({
      where: {
        id,
        groceryList: {
          mealPlan: {
            householdId: session.user.householdId,
          },
        },
      },
    })

    if (!item) {
      return NextResponse.json(
        { error: 'Grocery item not found' },
        { status: 404 }
      )
    }

    await db.groceryItem.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting grocery item:', error)
    return NextResponse.json(
      { error: 'Failed to delete grocery item' },
      { status: 500 }
    )
  }
}
