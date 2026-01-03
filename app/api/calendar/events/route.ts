import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getEventsForDay, isCalendarConnected } from '@/lib/google-calendar'

export async function GET(request: Request) {
  const session = await auth()

  if (!session?.user?.householdId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const dateParam = searchParams.get('date')

  if (!dateParam) {
    return NextResponse.json(
      { error: 'date parameter is required' },
      { status: 400 }
    )
  }

  try {
    const date = new Date(dateParam)
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
    }

    const connected = await isCalendarConnected(session.user.householdId)
    const events = await getEventsForDay(session.user.householdId, date)

    return NextResponse.json({
      connected,
      events,
    })
  } catch (error) {
    console.error('Error fetching calendar events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch calendar events' },
      { status: 500 }
    )
  }
}
