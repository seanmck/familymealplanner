import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { content } = body

    if (!content?.trim()) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    // Verify feedback belongs to household
    const existing = await db.mealFeedback.findFirst({
      where: { id },
      include: {
        plannedMeal: {
          include: { mealPlan: true },
        },
      },
    })

    if (!existing || existing.plannedMeal.mealPlan.householdId !== session.user.householdId) {
      return NextResponse.json(
        { error: 'Meal feedback not found' },
        { status: 404 }
      )
    }

    const feedback = await db.mealFeedback.update({
      where: { id },
      data: { content: content.trim() },
      include: { familyMember: true },
    })

    return NextResponse.json(feedback)
  } catch (error) {
    console.error('Error updating meal feedback:', error)
    return NextResponse.json(
      { error: 'Failed to update meal feedback' },
      { status: 500 }
    )
  }
}

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

    // Verify feedback belongs to household
    const feedback = await db.mealFeedback.findFirst({
      where: { id },
      include: {
        plannedMeal: {
          include: { mealPlan: true },
        },
      },
    })

    if (!feedback || feedback.plannedMeal.mealPlan.householdId !== session.user.householdId) {
      return NextResponse.json(
        { error: 'Meal feedback not found' },
        { status: 404 }
      )
    }

    await db.mealFeedback.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting meal feedback:', error)
    return NextResponse.json(
      { error: 'Failed to delete meal feedback' },
      { status: 500 }
    )
  }
}
