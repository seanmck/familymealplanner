import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

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

    // Verify planned meal belongs to household
    const plannedMeal = await db.plannedMeal.findFirst({
      where: { id },
      include: {
        mealPlan: true,
      },
    })

    if (!plannedMeal || plannedMeal.mealPlan.householdId !== session.user.householdId) {
      return NextResponse.json(
        { error: 'Planned meal not found' },
        { status: 404 }
      )
    }

    await db.plannedMeal.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting planned meal:', error)
    return NextResponse.json(
      { error: 'Failed to delete planned meal' },
      { status: 500 }
    )
  }
}
