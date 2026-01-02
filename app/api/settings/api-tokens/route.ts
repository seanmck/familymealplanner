import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { generateApiToken, hashToken } from '@/lib/api-auth'

// GET /api/settings/api-tokens - List all tokens for the household
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tokens = await db.apiToken.findMany({
      where: { householdId: session.user.householdId },
      select: {
        id: true,
        name: true,
        createdAt: true,
        lastUsedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(tokens)
  } catch (error) {
    console.error('Error listing API tokens:', error)
    return NextResponse.json(
      { error: 'Failed to list API tokens' },
      { status: 500 }
    )
  }
}

// POST /api/settings/api-tokens - Create a new token
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name } = body

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Token name is required' },
        { status: 400 }
      )
    }

    // Generate a new token
    const plainToken = generateApiToken()
    const hashedToken = hashToken(plainToken)

    // Store the hashed token
    const apiToken = await db.apiToken.create({
      data: {
        name: name.trim(),
        token: hashedToken,
        householdId: session.user.householdId,
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
      },
    })

    // Return the plain token ONLY on creation (it won't be retrievable later)
    return NextResponse.json({
      ...apiToken,
      token: plainToken,
    })
  } catch (error) {
    console.error('Error creating API token:', error)
    return NextResponse.json(
      { error: 'Failed to create API token' },
      { status: 500 }
    )
  }
}
