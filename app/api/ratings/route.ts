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
    const { recipeId, memberId, rating } = body

    if (!recipeId || !memberId || !rating) {
      return NextResponse.json(
        { error: 'Recipe ID, member ID, and rating are required' },
        { status: 400 }
      )
    }

    if (!['UP', 'DOWN', 'NEUTRAL'].includes(rating)) {
      return NextResponse.json(
        { error: 'Invalid rating value' },
        { status: 400 }
      )
    }

    // Verify recipe and member belong to household
    const recipe = await db.recipe.findFirst({
      where: { id: recipeId, householdId: session.user.householdId },
    })
    const member = await db.familyMember.findFirst({
      where: { id: memberId, householdId: session.user.householdId },
    })

    if (!recipe || !member) {
      return NextResponse.json(
        { error: 'Recipe or family member not found' },
        { status: 404 }
      )
    }

    // Upsert rating
    const recipeRating = await db.recipeRating.upsert({
      where: {
        recipeId_memberId: {
          recipeId,
          memberId,
        },
      },
      update: { rating },
      create: {
        recipeId,
        memberId,
        rating,
      },
      include: { member: true },
    })

    return NextResponse.json(recipeRating)
  } catch (error) {
    console.error('Error saving rating:', error)
    return NextResponse.json(
      { error: 'Failed to save rating' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const recipeId = searchParams.get('recipeId')
    const memberId = searchParams.get('memberId')

    if (!recipeId || !memberId) {
      return NextResponse.json(
        { error: 'Recipe ID and member ID are required' },
        { status: 400 }
      )
    }

    // Verify recipe and member belong to household
    const recipe = await db.recipe.findFirst({
      where: { id: recipeId, householdId: session.user.householdId },
    })
    const member = await db.familyMember.findFirst({
      where: { id: memberId, householdId: session.user.householdId },
    })

    if (!recipe || !member) {
      return NextResponse.json(
        { error: 'Recipe or family member not found' },
        { status: 404 }
      )
    }

    await db.recipeRating.delete({
      where: {
        recipeId_memberId: {
          recipeId,
          memberId,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting rating:', error)
    return NextResponse.json(
      { error: 'Failed to delete rating' },
      { status: 500 }
    )
  }
}
