import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const recipe = await db.recipe.findFirst({
      where: {
        id,
        householdId: session.user.householdId,
      },
      include: {
        ingredients: { orderBy: { sortOrder: 'asc' } },
        ratings: {
          include: { member: true },
        },
      },
    })

    if (!recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }

    return NextResponse.json(recipe)
  } catch (error) {
    console.error('Error fetching recipe:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recipe' },
      { status: 500 }
    )
  }
}

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
    const {
      title,
      description,
      prepTimeMinutes,
      cookTimeMinutes,
      servings,
      instructions,
      tags,
      ingredients,
    } = body

    // Verify recipe belongs to household
    const existingRecipe = await db.recipe.findFirst({
      where: {
        id,
        householdId: session.user.householdId,
      },
    })

    if (!existingRecipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }

    // Update recipe and replace ingredients
    const recipe = await db.$transaction(async (tx) => {
      // Delete existing ingredients
      await tx.ingredient.deleteMany({
        where: { recipeId: id },
      })

      // Update recipe with new ingredients
      return tx.recipe.update({
        where: { id },
        data: {
          title,
          description,
          prepTimeMinutes,
          cookTimeMinutes,
          servings,
          instructions,
          tags: tags || [],
          ingredients: {
            create: (ingredients || []).map((ing: { name: string; quantity?: number; unit?: string; notes?: string }, index: number) => ({
              name: ing.name,
              quantity: ing.quantity,
              unit: ing.unit,
              notes: ing.notes,
              sortOrder: index,
            })),
          },
        },
        include: {
          ingredients: { orderBy: { sortOrder: 'asc' } },
        },
      })
    })

    return NextResponse.json(recipe)
  } catch (error) {
    console.error('Error updating recipe:', error)
    return NextResponse.json(
      { error: 'Failed to update recipe' },
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

    // Verify recipe belongs to household
    const existingRecipe = await db.recipe.findFirst({
      where: {
        id,
        householdId: session.user.householdId,
      },
    })

    if (!existingRecipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }

    await db.recipe.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting recipe:', error)
    return NextResponse.json(
      { error: 'Failed to delete recipe' },
      { status: 500 }
    )
  }
}
