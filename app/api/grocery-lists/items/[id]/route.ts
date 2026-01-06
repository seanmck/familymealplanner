import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// PATCH - Update a grocery item (e.g., check/uncheck, edit name)
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

    // Verify item belongs to household and get current state for tracking
    const item = await db.groceryItem.findFirst({
      where: {
        id,
        groceryList: {
          mealPlan: {
            householdId: session.user.householdId,
          },
        },
      },
      select: {
        id: true,
        name: true,
        sourceKey: true,
        groceryListId: true,
        isChecked: true,
      },
    })

    if (!item) {
      return NextResponse.json(
        { error: 'Grocery item not found' },
        { status: 404 }
      )
    }

    // Track name edits in editedItems (only if item has sourceKey)
    if (updates.name && updates.name !== item.name && item.sourceKey) {
      const groceryList = await db.groceryList.findUnique({
        where: { id: item.groceryListId },
        select: { editedItems: true },
      })
      const existingEdits = (groceryList?.editedItems as Record<string, string>) || {}
      existingEdits[item.sourceKey] = updates.name
      await db.groceryList.update({
        where: { id: item.groceryListId },
        data: { editedItems: existingEdits },
      })
    }

    // Track checked status changes in checkedSourceKeys (only if item has sourceKey)
    if (typeof updates.isChecked === 'boolean' && updates.isChecked !== item.isChecked && item.sourceKey) {
      const groceryList = await db.groceryList.findUnique({
        where: { id: item.groceryListId },
        select: { checkedSourceKeys: true },
      })
      const checkedKeys = new Set(groceryList?.checkedSourceKeys || [])
      if (updates.isChecked) {
        checkedKeys.add(item.sourceKey)
      } else {
        checkedKeys.delete(item.sourceKey)
      }
      await db.groceryList.update({
        where: { id: item.groceryListId },
        data: { checkedSourceKeys: Array.from(checkedKeys) },
      })
    }

    // Update the item itself
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

// DELETE - Remove a grocery item (and track exclusion for regeneration)
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

    // Verify item belongs to household and get sourceKey + groceryListId
    const item = await db.groceryItem.findFirst({
      where: {
        id,
        groceryList: {
          mealPlan: {
            householdId: session.user.householdId,
          },
        },
      },
      select: {
        id: true,
        name: true,
        sourceKey: true,
        groceryListId: true,
      },
    })

    if (!item) {
      return NextResponse.json(
        { error: 'Grocery item not found' },
        { status: 404 }
      )
    }

    // Use sourceKey for exclusion tracking (fall back to name-based key for legacy items)
    let keyToExclude = item.sourceKey
    if (!keyToExclude) {
      // Legacy item without sourceKey - generate one based on name
      const nameWithoutCount = item.name.replace(/ \(\d+x\)$/i, '')
      const normalizedName = nameWithoutCount.toLowerCase().trim()
      keyToExclude = `ingredient:${normalizedName}-`
    }

    // Fetch current grocery list to update editedItems and checkedSourceKeys
    const groceryList = await db.groceryList.findUnique({
      where: { id: item.groceryListId },
      select: { editedItems: true, checkedSourceKeys: true },
    })

    // Clean up editedItems (remove entry for this sourceKey)
    const currentEdits = (groceryList?.editedItems as Record<string, string>) || {}
    const updatedEdits = { ...currentEdits }
    delete updatedEdits[keyToExclude]

    // Clean up checkedSourceKeys (remove this sourceKey)
    const updatedChecked = (groceryList?.checkedSourceKeys || []).filter(
      (k) => k !== keyToExclude
    )

    // Update grocery list with exclusion and cleanup
    await db.groceryList.update({
      where: { id: item.groceryListId },
      data: {
        excludedItems: { push: keyToExclude },
        editedItems: updatedEdits,
        checkedSourceKeys: updatedChecked,
      },
    })

    // Delete the item
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
