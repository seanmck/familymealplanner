import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuth } from '@/lib/api-auth'
import { generateGroceryList } from '@/lib/grocery'

// GET - Generate fresh grocery list for a meal plan
export async function GET(request: Request) {
  try {
    const authResult = await getAuth(request)
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const mealPlanId = searchParams.get('mealPlanId')

    if (!mealPlanId) {
      return NextResponse.json(
        { error: 'mealPlanId is required' },
        { status: 400 }
      )
    }

    // Verify meal plan belongs to household
    const mealPlan = await db.mealPlan.findFirst({
      where: {
        id: mealPlanId,
        householdId: authResult.householdId,
      },
    })

    if (!mealPlan) {
      return NextResponse.json(
        { error: 'Meal plan not found' },
        { status: 404 }
      )
    }

    // Always generate fresh list
    const groceryList = await generateGroceryList(mealPlanId, authResult.householdId)
    return NextResponse.json(groceryList)
  } catch (error) {
    console.error('Error fetching grocery list:', error)
    return NextResponse.json(
      { error: 'Failed to fetch grocery list' },
      { status: 500 }
    )
  }
}

// POST - Generate grocery list from meal plan (kept for backward compatibility)
export async function POST(request: Request) {
  try {
    const authResult = await getAuth(request)
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { mealPlanId } = await request.json()

    if (!mealPlanId) {
      return NextResponse.json(
        { error: 'mealPlanId is required' },
        { status: 400 }
      )
    }

    const groceryList = await generateGroceryList(mealPlanId, authResult.householdId)

    if (!groceryList) {
      return NextResponse.json(
        { error: 'Meal plan not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(groceryList)
  } catch (error) {
    console.error('Error generating grocery list:', error)
    return NextResponse.json(
      { error: 'Failed to generate grocery list' },
      { status: 500 }
    )
  }
}
