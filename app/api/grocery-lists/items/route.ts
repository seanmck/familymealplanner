import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// POST - Add a manual item to grocery list
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { groceryListId, name, quantity, unit, category } = await request.json()

    if (!groceryListId || !name) {
      return NextResponse.json(
        { error: 'groceryListId and name are required' },
        { status: 400 }
      )
    }

    // Verify grocery list belongs to household
    const groceryList = await db.groceryList.findFirst({
      where: {
        id: groceryListId,
        mealPlan: {
          householdId: session.user.householdId,
        },
      },
    })

    if (!groceryList) {
      return NextResponse.json(
        { error: 'Grocery list not found' },
        { status: 404 }
      )
    }

    // Generate sourceKey for manual items
    const normalizedName = name.toLowerCase().trim()
    const sourceKey = `manual:${normalizedName}`

    const item = await db.groceryItem.create({
      data: {
        groceryListId,
        name,
        quantity: quantity || 1,
        unit: unit || null,
        category: category || 'Other',
        isChecked: false,
        isManualAdd: true,
        sourceKey,
      },
    })

    return NextResponse.json(item)
  } catch (error) {
    console.error('Error adding grocery item:', error)
    return NextResponse.json(
      { error: 'Failed to add grocery item' },
      { status: 500 }
    )
  }
}
