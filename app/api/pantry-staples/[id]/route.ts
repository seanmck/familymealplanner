import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// DELETE - Remove a pantry staple
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

    // Verify staple belongs to household
    const staple = await db.pantryStaple.findFirst({
      where: {
        id,
        householdId: session.user.householdId,
      },
    })

    if (!staple) {
      return NextResponse.json(
        { error: 'Pantry staple not found' },
        { status: 404 }
      )
    }

    await db.pantryStaple.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting pantry staple:', error)
    return NextResponse.json(
      { error: 'Failed to delete pantry staple' },
      { status: 500 }
    )
  }
}
