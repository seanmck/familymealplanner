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
    const { mealPlanId, recipeId, placeholderTitle, dayOfWeek, mealType, notes, familyMemberId } = body

    if (mealPlanId === undefined || dayOfWeek === undefined || !mealType) {
      return NextResponse.json(
        { error: 'mealPlanId, dayOfWeek, and mealType are required' },
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
      return NextResponse.json(
        { error: 'Meal plan not found' },
        { status: 404 }
      )
    }

    // If recipeId provided, verify it belongs to household
    if (recipeId) {
      const recipe = await db.recipe.findFirst({
        where: {
          id: recipeId,
          householdId: session.user.householdId,
        },
      })

      if (!recipe) {
        return NextResponse.json(
          { error: 'Recipe not found' },
          { status: 404 }
        )
      }
    }

    // If familyMemberId provided, verify it belongs to household
    if (familyMemberId) {
      const familyMember = await db.familyMember.findFirst({
        where: {
          id: familyMemberId,
          householdId: session.user.householdId,
        },
      })

      if (!familyMember) {
        return NextResponse.json(
          { error: 'Family member not found' },
          { status: 404 }
        )
      }
    }

    // Upsert planned meal (replace if exists for this slot + family member)
    const plannedMeal = await db.plannedMeal.upsert({
      where: {
        mealPlanId_dayOfWeek_mealType_familyMemberId: {
          mealPlanId,
          dayOfWeek,
          mealType,
          familyMemberId: familyMemberId || null,
        },
      },
      update: {
        recipeId: recipeId || null,
        placeholderTitle: placeholderTitle || null,
        notes: notes || null,
      },
      create: {
        mealPlanId,
        dayOfWeek,
        mealType,
        recipeId: recipeId || null,
        placeholderTitle: placeholderTitle || null,
        notes: notes || null,
        familyMemberId: familyMemberId || null,
      },
      include: {
        recipe: {
          include: {
            ratings: { include: { member: true } },
          },
        },
        familyMember: true,
      },
    })

    return NextResponse.json(plannedMeal)
  } catch (error) {
    console.error('Error saving planned meal:', error)
    return NextResponse.json(
      { error: 'Failed to save planned meal' },
      { status: 500 }
    )
  }
}
