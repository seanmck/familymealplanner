import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuth } from '@/lib/api-auth'

export async function GET(request: Request) {
  try {
    const authResult = await getAuth(request)
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const members = await db.familyMember.findMany({
      where: { householdId: authResult.householdId },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    })

    return NextResponse.json(members)
  } catch (error) {
    console.error('Error fetching family members:', error)
    return NextResponse.json(
      { error: 'Failed to fetch family members' },
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
    const { name, role } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const member = await db.familyMember.create({
      data: {
        name,
        role: role || 'ADULT',
        householdId: authResult.householdId,
      },
    })

    return NextResponse.json(member, { status: 201 })
  } catch (error) {
    console.error('Error creating family member:', error)
    return NextResponse.json(
      { error: 'Failed to create family member' },
      { status: 500 }
    )
  }
}
