import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// DELETE /api/settings/api-tokens/[id] - Revoke a token
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verify the token belongs to this household
    const existingToken = await db.apiToken.findFirst({
      where: {
        id,
        householdId: session.user.householdId,
      },
    })

    if (!existingToken) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 })
    }

    await db.apiToken.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting API token:', error)
    return NextResponse.json(
      { error: 'Failed to delete API token' },
      { status: 500 }
    )
  }
}
