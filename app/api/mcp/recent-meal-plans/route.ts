import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuth } from '@/lib/api-auth'

interface SimplifiedMealPlan {
  id: string
  weekStartDate: string
  meals: {
    dayOfWeek: number
    dayName: string
    mealType: string
    recipes: {
      id: string
      title: string
      type: string
    }[]
    placeholder?: string
  }[]
}

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export async function GET(request: Request) {
  try {
    const authResult = await getAuth(request)
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const weeksParam = searchParams.get('weeks')
    const weeks = weeksParam ? parseInt(weeksParam, 10) : 4

    // Calculate the date range
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - weeks * 7)

    const mealPlans = await db.mealPlan.findMany({
      where: {
        householdId: authResult.householdId,
        weekStartDate: { gte: startDate },
      },
      include: {
        plannedMeals: {
          where: { familyMemberId: null }, // Only shared family meals
          include: {
            recipes: {
              include: {
                recipe: {
                  select: {
                    id: true,
                    title: true,
                    type: true,
                  },
                },
              },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
      orderBy: { weekStartDate: 'desc' },
    })

    const simplifiedPlans: SimplifiedMealPlan[] = mealPlans.map((plan) => ({
      id: plan.id,
      weekStartDate: plan.weekStartDate.toISOString().split('T')[0],
      meals: plan.plannedMeals.map((meal) => ({
        dayOfWeek: meal.dayOfWeek,
        dayName: DAY_NAMES[meal.dayOfWeek] || `Day ${meal.dayOfWeek}`,
        mealType: meal.mealType,
        recipes: meal.recipes.map((pmr) => ({
          id: pmr.recipe.id,
          title: pmr.recipe.title,
          type: pmr.recipe.type,
        })),
        ...(meal.placeholderTitle && { placeholder: meal.placeholderTitle }),
      })),
    }))

    return NextResponse.json({
      mealPlans: simplifiedPlans,
      weeksIncluded: weeks,
    })
  } catch (error) {
    console.error('Error fetching recent meal plans:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recent meal plans' },
      { status: 500 }
    )
  }
}
