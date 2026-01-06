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
    const { plannedMealId, content, familyMemberId } = body

    if (!plannedMealId || !content?.trim()) {
      return NextResponse.json(
        { error: 'Planned meal ID and content are required' },
        { status: 400 }
      )
    }

    // Verify plannedMeal belongs to household
    const plannedMeal = await db.plannedMeal.findFirst({
      where: {
        id: plannedMealId,
        mealPlan: { householdId: session.user.householdId },
      },
    })

    if (!plannedMeal) {
      return NextResponse.json(
        { error: 'Planned meal not found' },
        { status: 404 }
      )
    }

    // If familyMemberId provided, verify it belongs to household
    if (familyMemberId) {
      const member = await db.familyMember.findFirst({
        where: { id: familyMemberId, householdId: session.user.householdId },
      })
      if (!member) {
        return NextResponse.json(
          { error: 'Family member not found' },
          { status: 404 }
        )
      }
    }

    const feedback = await db.mealFeedback.create({
      data: {
        plannedMealId,
        content: content.trim(),
        familyMemberId: familyMemberId || null,
      },
      include: { familyMember: true },
    })

    return NextResponse.json(feedback)
  } catch (error) {
    console.error('Error creating meal feedback:', error)
    return NextResponse.json(
      { error: 'Failed to create meal feedback' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const plannedMealId = searchParams.get('plannedMealId')

    if (!plannedMealId) {
      return NextResponse.json(
        { error: 'Planned meal ID is required' },
        { status: 400 }
      )
    }

    // Verify plannedMeal belongs to household
    const plannedMeal = await db.plannedMeal.findFirst({
      where: {
        id: plannedMealId,
        mealPlan: { householdId: session.user.householdId },
      },
    })

    if (!plannedMeal) {
      return NextResponse.json(
        { error: 'Planned meal not found' },
        { status: 404 }
      )
    }

    const feedback = await db.mealFeedback.findMany({
      where: { plannedMealId },
      include: { familyMember: true },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(feedback)
  } catch (error) {
    console.error('Error fetching meal feedback:', error)
    return NextResponse.json(
      { error: 'Failed to fetch meal feedback' },
      { status: 500 }
    )
  }
}
