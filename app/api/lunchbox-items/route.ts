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
    const { mealPlanId, familyMemberId, dayOfWeek, category, name, notes, sortOrder } = body

    if (!mealPlanId || !familyMemberId || dayOfWeek === undefined || !category || !name) {
      return NextResponse.json(
        { error: 'mealPlanId, familyMemberId, dayOfWeek, category, and name are required' },
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

    // Verify family member belongs to household
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

    const lunchboxItem = await db.lunchboxItem.create({
      data: {
        mealPlanId,
        familyMemberId,
        dayOfWeek,
        category,
        name,
        notes: notes || null,
        sortOrder: sortOrder ?? 0,
      },
      include: {
        familyMember: true,
      },
    })

    return NextResponse.json(lunchboxItem, { status: 201 })
  } catch (error) {
    console.error('Error creating lunchbox item:', error)
    return NextResponse.json(
      { error: 'Failed to create lunchbox item' },
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
    const mealPlanId = searchParams.get('mealPlanId')
    const familyMemberId = searchParams.get('familyMemberId')
    const dayOfWeek = searchParams.get('dayOfWeek')

    if (!mealPlanId) {
      return NextResponse.json(
        { error: 'mealPlanId is required' },
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

    const where: {
      mealPlanId: string
      familyMemberId?: string
      dayOfWeek?: number
    } = { mealPlanId }

    if (familyMemberId) {
      where.familyMemberId = familyMemberId
    }
    if (dayOfWeek !== null) {
      where.dayOfWeek = parseInt(dayOfWeek!, 10)
    }

    const lunchboxItems = await db.lunchboxItem.findMany({
      where,
      include: {
        familyMember: true,
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { sortOrder: 'asc' },
      ],
    })

    return NextResponse.json(lunchboxItems)
  } catch (error) {
    console.error('Error fetching lunchbox items:', error)
    return NextResponse.json(
      { error: 'Failed to fetch lunchbox items' },
      { status: 500 }
    )
  }
}
