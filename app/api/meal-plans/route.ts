import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuth } from '@/lib/api-auth'

export async function GET(request: Request) {
  try {
    const authResult = await getAuth(request)
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const weekStart = searchParams.get('weekStart')

    if (!weekStart) {
      return NextResponse.json(
        { error: 'weekStart is required' },
        { status: 400 }
      )
    }

    const mealPlan = await db.mealPlan.findFirst({
      where: {
        householdId: authResult.householdId,
        weekStartDate: new Date(weekStart),
      },
      include: {
        plannedMeals: {
          include: {
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
            feedback: {
              include: { familyMember: true },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
        lunchboxItems: {
          include: {
            familyMember: true,
          },
          orderBy: [
            { dayOfWeek: 'asc' },
            { sortOrder: 'asc' },
          ],
        },
      },
    })

    return NextResponse.json(mealPlan)
  } catch (error) {
    console.error('Error fetching meal plan:', error)
    return NextResponse.json(
      { error: 'Failed to fetch meal plan' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await getAuth(request)
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { weekStartDate } = body

    if (!weekStartDate) {
      return NextResponse.json(
        { error: 'weekStartDate is required' },
        { status: 400 }
      )
    }

    // Check if meal plan already exists
    const existing = await db.mealPlan.findFirst({
      where: {
        householdId: authResult.householdId,
        weekStartDate: new Date(weekStartDate),
      },
    })

    if (existing) {
      return NextResponse.json(existing)
    }

    // Create new meal plan
    const mealPlan = await db.mealPlan.create({
      data: {
        weekStartDate: new Date(weekStartDate),
        householdId: authResult.householdId,
      },
      include: {
        plannedMeals: {
          include: {
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
            feedback: {
              include: { familyMember: true },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
        lunchboxItems: {
          include: {
            familyMember: true,
          },
          orderBy: [
            { dayOfWeek: 'asc' },
            { sortOrder: 'asc' },
          ],
        },
      },
    })

    return NextResponse.json(mealPlan, { status: 201 })
  } catch (error) {
    console.error('Error creating meal plan:', error)
    return NextResponse.json(
      { error: 'Failed to create meal plan' },
      { status: 500 }
    )
  }
}
