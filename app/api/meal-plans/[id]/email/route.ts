import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuth } from '@/lib/api-auth'
import { sendWeeklySummaryEmail } from '@/lib/email'
import { getEventsForDateRange, CalendarEvent } from '@/lib/google-calendar'
import { generateGroceryList } from '@/lib/grocery'

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

function formatDate(date: Date, dayOffset: number): string {
  const d = new Date(date)
  d.setDate(d.getDate() + dayOffset)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatWeekRange(weekStart: Date): string {
  const start = new Date(weekStart)
  const end = new Date(weekStart)
  end.setDate(end.getDate() + 6)

  const startMonth = start.toLocaleDateString('en-US', { month: 'short' })
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' })

  if (startMonth === endMonth) {
    return `${startMonth} ${start.getDate()}-${end.getDate()}`
  }
  return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}`
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuth(request)
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: mealPlanId } = await params

    // Fetch meal plan with recipes
    const mealPlan = await db.mealPlan.findFirst({
      where: {
        id: mealPlanId,
        householdId: authResult.householdId,
      },
      include: {
        household: true,
        plannedMeals: {
          include: {
            recipes: {
              include: {
                recipe: true,
              },
              orderBy: { sortOrder: 'asc' },
            },
            familyMember: true,
          },
        },
      },
    })

    if (!mealPlan) {
      return NextResponse.json(
        { error: 'Meal plan not found' },
        { status: 404 }
      )
    }

    // Fetch all users in household
    const users = await db.user.findMany({
      where: { householdId: authResult.householdId },
      select: { email: true },
    })

    const recipients = users.map((u) => u.email)

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: 'No household members to email' },
        { status: 400 }
      )
    }

    // Fetch calendar events for the week (gracefully returns empty if not connected)
    const weekEnd = new Date(mealPlan.weekStartDate)
    weekEnd.setDate(weekEnd.getDate() + 7)
    const calendarEvents = await getEventsForDateRange(
      authResult.householdId,
      mealPlan.weekStartDate,
      weekEnd
    )

    // Helper to get the date string (YYYY-MM-DD) for a day index
    const getDateStringForDay = (dayIndex: number): string => {
      const date = new Date(mealPlan.weekStartDate)
      // Use UTC methods to avoid timezone shifts
      date.setUTCDate(date.getUTCDate() + dayIndex)
      return date.toISOString().slice(0, 10) // "YYYY-MM-DD"
    }

    // Helper to get events for a specific day by comparing date strings
    const getEventsForDay = (dayIndex: number): CalendarEvent[] => {
      const targetDate = getDateStringForDay(dayIndex)

      return calendarEvents.filter((event) => {
        // For all-day events, start is "YYYY-MM-DD"
        // For timed events, start is "YYYY-MM-DDTHH:MM:SS..." - extract date portion
        const eventDate = event.start.slice(0, 10)
        return eventDate === targetDate
      })
    }

    // Build dinner data - shared family dinners plus events and alternates
    const dinners = DAYS_OF_WEEK.map((day, index) => {
      // Main shared dinner (familyMemberId is null)
      const meal = mealPlan.plannedMeals.find(
        (m) =>
          m.dayOfWeek === index &&
          m.mealType === 'DINNER' &&
          m.familyMemberId === null
      )

      // Alternate dinners for this day (familyMemberId is not null)
      const alternateMeals = mealPlan.plannedMeals
        .filter(
          (m) =>
            m.dayOfWeek === index &&
            m.mealType === 'DINNER' &&
            m.familyMemberId !== null
        )
        .map((m) => {
          const mainRecipe = m.recipes.find((r) => r.role === 'MAIN')?.recipe
          return {
            memberName: m.familyMember?.name || 'Unknown',
            title: mainRecipe?.title || m.placeholderTitle || 'Alternate meal',
          }
        })

      // Calendar events for this day
      const dayEvents = getEventsForDay(index).map((e) => ({
        summary: e.summary,
        time: e.allDay ? 'All day' : new Date(e.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        allDay: e.allDay,
      }))

      if (!meal) {
        return {
          day,
          date: formatDate(mealPlan.weekStartDate, index),
          title: 'No dinner planned',
          imageUrl: null,
          description: null,
          sourceUrl: null,
          sides: [],
          events: dayEvents.length > 0 ? dayEvents : undefined,
          alternateMeals: alternateMeals.length > 0 ? alternateMeals : undefined,
        }
      }

      const mainRecipe = meal.recipes.find((r) => r.role === 'MAIN')?.recipe
      const sideRecipes = meal.recipes
        .filter((r) => r.role === 'SIDE')
        .map((r) => r.recipe.title)

      return {
        day,
        date: formatDate(mealPlan.weekStartDate, index),
        title: mainRecipe?.title || meal.placeholderTitle || 'No dinner planned',
        imageUrl: mainRecipe?.imageUrl || null,
        description: mainRecipe?.description || null,
        sourceUrl: mainRecipe?.sourceUrl || null,
        sides: sideRecipes,
        events: dayEvents.length > 0 ? dayEvents : undefined,
        alternateMeals: alternateMeals.length > 0 ? alternateMeals : undefined,
      }
    })

    // Fetch existing excluded items to preserve user deletions
    const existingList = await db.groceryList.findUnique({
      where: { mealPlanId },
      select: { excludedItems: true },
    })

    // Generate fresh grocery list (preserving user deletions)
    const groceryList = await generateGroceryList(
      mealPlanId,
      authResult.householdId,
      existingList?.excludedItems || []
    )

    // Filter to unchecked items and group by category
    const uncheckedItems = groceryList?.items.filter((item) => !item.isChecked) || []

    const categoryMap = new Map<
      string,
      Array<{ name: string; quantity: number | null; unit: string | null }>
    >()

    for (const item of uncheckedItems) {
      const category = item.category || 'Other'
      if (!categoryMap.has(category)) {
        categoryMap.set(category, [])
      }
      categoryMap.get(category)!.push({
        name: item.name,
        quantity: item.quantity ? Number(item.quantity) : null,
        unit: item.unit,
      })
    }

    // Sort categories alphabetically, "Other" last
    const sortedCategories = Array.from(categoryMap.keys()).sort((a, b) => {
      if (a === 'Other') return 1
      if (b === 'Other') return -1
      return a.localeCompare(b)
    })

    const groceryItems = sortedCategories.map((category) => ({
      category,
      items: categoryMap.get(category)!,
    }))

    // Build planner URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const plannerUrl = `${appUrl}/planner`

    // Send email
    const result = await sendWeeklySummaryEmail({
      recipients,
      weekRange: formatWeekRange(mealPlan.weekStartDate),
      dinners,
      groceryItems,
      householdName: mealPlan.household.name,
      plannerUrl,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      recipientCount: recipients.length,
    })
  } catch (error) {
    console.error('Error sending meal plan email:', error)
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    )
  }
}
