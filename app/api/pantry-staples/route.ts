import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuth } from '@/lib/api-auth'

// GET - Fetch all pantry staples for household
export async function GET(request: Request) {
  try {
    const authResult = await getAuth(request)
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const staples = await db.pantryStaple.findMany({
      where: { householdId: authResult.householdId },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(staples)
  } catch (error) {
    console.error('Error fetching pantry staples:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pantry staples' },
      { status: 500 }
    )
  }
}

// POST - Add a new pantry staple
export async function POST(request: Request) {
  try {
    const authResult = await getAuth(request)
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name } = await request.json()

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    const displayName = name.trim()
    const normalizedName = displayName.toLowerCase()

    // Check if staple already exists
    const existing = await db.pantryStaple.findFirst({
      where: {
        householdId: authResult.householdId,
        name: normalizedName,
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Staple already exists' },
        { status: 409 }
      )
    }

    const staple = await db.pantryStaple.create({
      data: {
        name: normalizedName,
        displayName,
        householdId: authResult.householdId,
      },
    })

    return NextResponse.json(staple)
  } catch (error) {
    console.error('Error creating pantry staple:', error)
    return NextResponse.json(
      { error: 'Failed to create pantry staple' },
      { status: 500 }
    )
  }
}
