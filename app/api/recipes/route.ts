import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuth } from '@/lib/api-auth'
import { RecipeType } from '@prisma/client'

export async function GET(request: Request) {
  try {
    const authResult = await getAuth(request)
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const tag = searchParams.get('tag') || ''
    const type = searchParams.get('type') as RecipeType | null

    const recipes = await db.recipe.findMany({
      where: {
        householdId: authResult.householdId,
        ...(search && {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { ingredients: { some: { name: { contains: search, mode: 'insensitive' } } } },
          ],
        }),
        ...(tag && { tags: { has: tag } }),
        ...(type && { type }),
      },
      include: {
        ingredients: true,
        ratings: {
          include: { member: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json(recipes)
  } catch (error) {
    console.error('Error fetching recipes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recipes' },
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
    const {
      title,
      description,
      prepTimeMinutes,
      cookTimeMinutes,
      servings,
      instructions,
      imageUrl,
      sourceUrl,
      tags,
      ingredients,
      type = 'MAIN',
    } = body

    if (!title || !instructions) {
      return NextResponse.json(
        { error: 'Title and instructions are required' },
        { status: 400 }
      )
    }

    const recipe = await db.recipe.create({
      data: {
        title,
        description,
        prepTimeMinutes,
        cookTimeMinutes,
        servings: servings || 4,
        instructions,
        imageUrl,
        sourceUrl,
        tags: tags || [],
        type: type as RecipeType,
        householdId: authResult.householdId,
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
        ingredients: true,
      },
    })

    return NextResponse.json(recipe, { status: 201 })
  } catch (error) {
    console.error('Error creating recipe:', error)
    return NextResponse.json(
      { error: 'Failed to create recipe' },
      { status: 500 }
    )
  }
}
