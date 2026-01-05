import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuth } from '@/lib/api-auth'

// GET - Fetch all perishables for household
export async function GET(request: Request) {
  try {
    const authResult = await getAuth(request)
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const perishables = await db.perishable.findMany({
      where: { householdId: authResult.householdId },
      orderBy: [
        { expirationDate: 'asc' },
        { displayName: 'asc' },
      ],
    })

    return NextResponse.json(perishables)
  } catch (error) {
    console.error('Error fetching perishables:', error)
    return NextResponse.json(
      { error: 'Failed to fetch perishables' },
      { status: 500 }
    )
  }
}

// POST - Add a new perishable item
export async function POST(request: Request) {
  try {
    const authResult = await getAuth(request)
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, quantity, unit, expirationDate } = await request.json()

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    const displayName = name.trim()
    const normalizedName = displayName.toLowerCase()

    // Check if perishable already exists
    const existing = await db.perishable.findFirst({
      where: {
        householdId: authResult.householdId,
        name: normalizedName,
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Perishable already exists' },
        { status: 409 }
      )
    }

    const perishable = await db.perishable.create({
      data: {
        name: normalizedName,
        displayName,
        quantity: quantity ? parseFloat(quantity) : null,
        unit: unit || null,
        expirationDate: expirationDate ? new Date(expirationDate) : null,
        householdId: authResult.householdId,
      },
    })

    return NextResponse.json(perishable)
  } catch (error) {
    console.error('Error creating perishable:', error)
    return NextResponse.json(
      { error: 'Failed to create perishable' },
      { status: 500 }
    )
  }
}
