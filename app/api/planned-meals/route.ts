import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { RecipeType } from '@prisma/client'

// Standard include for returning planned meals with full recipe data
const plannedMealInclude = {
  recipes: {
    include: {
      recipe: {
        include: {
          ratings: { include: { member: true } },
        },
      },
    },
    orderBy: { sortOrder: 'asc' },
  },
  familyMember: true,
} as const

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      mealPlanId,
      recipeId,
      placeholderTitle,
      dayOfWeek,
      mealType,
      notes,
      familyMemberId,
      role = 'MAIN' // Default to MAIN for backward compatibility
    } = body

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
    let recipe = null
    if (recipeId) {
      recipe = await db.recipe.findFirst({
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

    // Find existing meal for this slot (handle NULL familyMemberId correctly)
    let plannedMeal = await db.plannedMeal.findFirst({
      where: {
        mealPlanId,
        dayOfWeek,
        mealType,
        familyMemberId: familyMemberId || null,
      },
      include: plannedMealInclude,
    })

    if (plannedMeal) {
      // Update existing meal
      if (recipeId) {
        // If setting a MAIN, remove any existing MAIN first
        if (role === 'MAIN') {
          await db.plannedMealRecipe.deleteMany({
            where: {
              plannedMealId: plannedMeal.id,
              role: 'MAIN',
            },
          })
        }

        // Add the new recipe (upsert in case it already exists as a different role)
        await db.plannedMealRecipe.upsert({
          where: {
            plannedMealId_recipeId: {
              plannedMealId: plannedMeal.id,
              recipeId,
            },
          },
          create: {
            plannedMealId: plannedMeal.id,
            recipeId,
            role: role as RecipeType,
            sortOrder: role === 'MAIN' ? 0 : 10,
          },
          update: {
            role: role as RecipeType,
            sortOrder: role === 'MAIN' ? 0 : 10,
          },
        })
      }

      // Update placeholder/notes if provided
      plannedMeal = await db.plannedMeal.update({
        where: { id: plannedMeal.id },
        data: {
          placeholderTitle: recipeId ? null : (placeholderTitle || null),
          notes: notes || plannedMeal.notes,
        },
        include: plannedMealInclude,
      })
    } else {
      // Create new meal
      plannedMeal = await db.plannedMeal.create({
        data: {
          mealPlanId,
          dayOfWeek,
          mealType,
          placeholderTitle: recipeId ? null : (placeholderTitle || null),
          notes: notes || null,
          familyMemberId: familyMemberId || null,
          ...(recipeId && {
            recipes: {
              create: {
                recipeId,
                role: role as RecipeType,
                sortOrder: role === 'MAIN' ? 0 : 10,
              },
            },
          }),
        },
        include: plannedMealInclude,
      })
    }

    return NextResponse.json(plannedMeal)
  } catch (error) {
    console.error('Error saving planned meal:', error)
    const message = error instanceof Error ? error.message : 'Failed to save planned meal'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
