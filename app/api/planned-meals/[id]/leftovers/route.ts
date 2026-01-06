import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function PATCH(
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
    const { hasLeftovers, leftoversQuantity } = body

    if (typeof hasLeftovers !== 'boolean') {
      return NextResponse.json(
        { error: 'hasLeftovers must be a boolean' },
        { status: 400 }
      )
    }

    // Verify planned meal belongs to household
    const existing = await db.plannedMeal.findFirst({
      where: { id },
      include: { mealPlan: true },
    })

    if (!existing || existing.mealPlan.householdId !== session.user.householdId) {
      return NextResponse.json(
        { error: 'Planned meal not found' },
        { status: 404 }
      )
    }

    const plannedMeal = await db.plannedMeal.update({
      where: { id },
      data: {
        hasLeftovers,
        leftoversQuantity: hasLeftovers ? (leftoversQuantity || null) : null,
      },
    })

    return NextResponse.json(plannedMeal)
  } catch (error) {
    console.error('Error updating leftovers:', error)
    return NextResponse.json(
      { error: 'Failed to update leftovers' },
      { status: 500 }
    )
  }
}
