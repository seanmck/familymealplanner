import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// Copy entire lunch (recipe + lunchbox items) from one day to another for a family member
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

    // Fetch source lunch meal (LUNCH type for this family member on source day)
    const sourceMeal = await db.plannedMeal.findFirst({
      where: {
        mealPlanId,
        dayOfWeek: sourceDayOfWeek,
        mealType: 'LUNCH',
        familyMemberId,
      },
      include: {
        recipes: true,
      },
    })

    // Fetch source lunchbox items
    const sourceItems = await db.lunchboxItem.findMany({
      where: {
        mealPlanId,
        familyMemberId,
        dayOfWeek: sourceDayOfWeek,
      },
      orderBy: { sortOrder: 'asc' },
    })

    if (!sourceMeal && sourceItems.length === 0) {
      return NextResponse.json(
        { error: 'No lunch content to copy from source day' },
        { status: 400 }
      )
    }

    let mealCopied = false
    let itemsCopied = 0

    // Copy the planned meal if it exists
    if (sourceMeal) {
      // Delete existing target meal first
      await db.plannedMeal.deleteMany({
        where: {
          mealPlanId,
          dayOfWeek: targetDayOfWeek,
          mealType: 'LUNCH',
          familyMemberId,
        },
      })

      // Create new meal with same recipes
      const newMeal = await db.plannedMeal.create({
        data: {
          mealPlanId,
          dayOfWeek: targetDayOfWeek,
          mealType: 'LUNCH',
          familyMemberId,
          placeholderTitle: sourceMeal.placeholderTitle,
        },
      })

      // Copy recipe associations
      if (sourceMeal.recipes.length > 0) {
        await db.plannedMealRecipe.createMany({
          data: sourceMeal.recipes.map((r) => ({
            plannedMealId: newMeal.id,
            recipeId: r.recipeId,
            role: r.role,
            sortOrder: r.sortOrder,
          })),
        })
      }

      mealCopied = true
    }

    // Copy lunchbox items if any
    if (sourceItems.length > 0) {
      // Find max sortOrder on target day to append
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

      await db.lunchboxItem.createMany({
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

      itemsCopied = sourceItems.length
    }

    return NextResponse.json(
      { mealCopied, itemsCopied },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error copying lunch:', error)
    return NextResponse.json(
      { error: 'Failed to copy lunch' },
      { status: 500 }
    )
  }
}
