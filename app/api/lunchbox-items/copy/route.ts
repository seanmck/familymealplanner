import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { mealPlanId, familyMemberId, sourceDayOfWeek, targetDayOfWeek } = body

    if (
      !mealPlanId ||
      !familyMemberId ||
      sourceDayOfWeek === undefined ||
      targetDayOfWeek === undefined
    ) {
      return NextResponse.json(
        { error: 'mealPlanId, familyMemberId, sourceDayOfWeek, and targetDayOfWeek are required' },
        { status: 400 }
      )
    }

    if (sourceDayOfWeek === targetDayOfWeek) {
      return NextResponse.json(
        { error: 'Source and target days must be different' },
        { status: 400 }
      )
    }

    // Verify meal plan belongs to household
    const mealPlan = await db.mealPlan.findFirst({
      where: {
        id: mealPlanId,
        householdId: session.user.householdId,
      },
    })

    if (!mealPlan) {
      return NextResponse.json({ error: 'Meal plan not found' }, { status: 404 })
    }

    // Verify family member belongs to household
    const familyMember = await db.familyMember.findFirst({
      where: {
        id: familyMemberId,
        householdId: session.user.householdId,
      },
    })

    if (!familyMember) {
      return NextResponse.json({ error: 'Family member not found' }, { status: 404 })
    }

    // Fetch items from source day
    const sourceItems = await db.lunchboxItem.findMany({
      where: {
        mealPlanId,
        familyMemberId,
        dayOfWeek: sourceDayOfWeek,
      },
      orderBy: { sortOrder: 'asc' },
    })

    if (sourceItems.length === 0) {
      return NextResponse.json(
        { error: 'No items to copy from source day' },
        { status: 400 }
      )
    }

    // Find max sortOrder on target day to append after existing items
    const existingTargetItems = await db.lunchboxItem.findMany({
      where: {
        mealPlanId,
        familyMemberId,
        dayOfWeek: targetDayOfWeek,
      },
      select: { sortOrder: true },
    })

    const maxSortOrder =
      existingTargetItems.length > 0
        ? Math.max(...existingTargetItems.map((i) => i.sortOrder))
        : -1

    // Create copies with new dayOfWeek and adjusted sortOrder
    const createdItems = await db.lunchboxItem.createMany({
      data: sourceItems.map((item, index) => ({
        mealPlanId,
        familyMemberId,
        dayOfWeek: targetDayOfWeek,
        name: item.name,
        category: item.category,
        notes: item.notes,
        sortOrder: maxSortOrder + 1 + index,
      })),
    })

    return NextResponse.json(
      { copied: createdItems.count },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error copying lunchbox items:', error)
    return NextResponse.json(
      { error: 'Failed to copy lunchbox items' },
      { status: 500 }
    )
  }
}
