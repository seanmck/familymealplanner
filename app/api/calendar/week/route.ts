import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getWeekEventCounts } from '@/lib/google-calendar'

export async function GET(request: Request) {
  const session = await auth()

  if (!session?.user?.householdId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const weekStart = searchParams.get('weekStart')

  if (!weekStart) {
    return NextResponse.json(
      { error: 'weekStart parameter is required' },
      { status: 400 }
    )
  }

  try {
    const startDate = new Date(weekStart)
    if (isNaN(startDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid weekStart date' },
        { status: 400 }
      )
    }

    const data = await getWeekEventCounts(session.user.householdId, startDate)

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching calendar week data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch calendar data' },
      { status: 500 }
    )
  }
}
