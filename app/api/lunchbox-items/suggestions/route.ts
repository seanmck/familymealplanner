import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// GET - Fetch frequently used lunchbox items from recent history
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Look back 12 weeks
    const twelveWeeksAgo = new Date()
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84)

    // Get recent meal plans for this household
    const recentMealPlans = await db.mealPlan.findMany({
      where: {
        householdId: session.user.householdId,
        weekStartDate: {
          gte: twelveWeeksAgo,
        },
      },
      select: {
        id: true,
      },
    })

    const mealPlanIds = recentMealPlans.map((mp) => mp.id)

    if (mealPlanIds.length === 0) {
      return NextResponse.json([])
    }

    // Get all lunchbox items from these meal plans
    const lunchboxItems = await db.lunchboxItem.findMany({
      where: {
        mealPlanId: {
          in: mealPlanIds,
        },
      },
      select: {
        name: true,
        category: true,
      },
    })

    // Aggregate by normalized name
    const frequencyMap = new Map<
      string,
      { name: string; category: string | null; count: number }
    >()

    for (const item of lunchboxItems) {
      const normalizedName = item.name.toLowerCase().trim()
      const existing = frequencyMap.get(normalizedName)

      if (existing) {
        existing.count += 1
        // Keep the most recent category if it exists
        if (item.category && !existing.category) {
          existing.category = item.category
        }
      } else {
        frequencyMap.set(normalizedName, {
          name: item.name,
          category: item.category,
          count: 1,
        })
      }
    }

    // Sort by frequency and return top 15
    const suggestions = Array.from(frequencyMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 15)
      .map(({ name, category }) => ({
        name,
        category,
      }))

    return NextResponse.json(suggestions)
  } catch (error) {
    console.error('Error fetching lunchbox suggestions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch lunchbox suggestions' },
      { status: 500 }
    )
  }
}
