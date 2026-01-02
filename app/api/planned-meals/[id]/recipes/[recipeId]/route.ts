import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; recipeId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: plannedMealId, recipeId } = await params

    // Verify planned meal belongs to household
    const plannedMeal = await db.plannedMeal.findFirst({
      where: { id: plannedMealId },
      include: {
        mealPlan: true,
        recipes: true,
      },
    })

    if (!plannedMeal || plannedMeal.mealPlan.householdId !== session.user.householdId) {
      return NextResponse.json(
        { error: 'Planned meal not found' },
        { status: 404 }
      )
    }

    // Find and delete the recipe link
    const recipeLink = await db.plannedMealRecipe.findUnique({
      where: {
        plannedMealId_recipeId: {
          plannedMealId,
          recipeId,
        },
      },
    })

    if (!recipeLink) {
      return NextResponse.json(
        { error: 'Recipe not found in this meal' },
        { status: 404 }
      )
    }

    await db.plannedMealRecipe.delete({
      where: {
        plannedMealId_recipeId: {
          plannedMealId,
          recipeId,
        },
      },
    })

    // If this was the last recipe and there's no placeholder, delete the planned meal entirely
    const remainingRecipes = await db.plannedMealRecipe.count({
      where: { plannedMealId },
    })

    if (remainingRecipes === 0 && !plannedMeal.placeholderTitle) {
      await db.plannedMeal.delete({
        where: { id: plannedMealId },
      })
      return NextResponse.json({ success: true, mealDeleted: true })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing recipe from planned meal:', error)
    return NextResponse.json(
      { error: 'Failed to remove recipe from meal' },
      { status: 500 }
    )
  }
}
