import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { isCalendarConnected, getAvailableCalendars, CalendarInfo } from '@/lib/google-calendar'
import { Prisma } from '@prisma/client'

export async function GET() {
  const session = await auth()

  if (!session?.user?.householdId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const settings = await db.googleCalendarSettings.findUnique({
      where: { householdId: session.user.householdId },
      include: {
        connectedUser: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })

    const connected = await isCalendarConnected(session.user.householdId)

    return NextResponse.json({
      connected,
      connectedUserName: settings?.connectedUser?.name,
      connectedUserEmail: settings?.connectedUser?.email,
      calendarIds: settings?.calendarIds ?? ['primary'],
      availableCalendars: (settings?.availableCalendars as CalendarInfo[] | null) ?? [],
      showOnPlanner: settings?.showOnPlanner ?? true,
    })
  } catch (error) {
    console.error('Error fetching calendar settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch calendar settings' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const session = await auth()

  if (!session?.user?.householdId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { action, showOnPlanner, calendarIds } = body

    if (action === 'connect') {
      // Connect the current user's calendar to the household
      // First verify the user has a Google account
      const userWithGoogle = await db.user.findUnique({
        where: { id: session.user.id },
        include: {
          accounts: {
            where: { provider: 'google' },
          },
        },
      })

      if (!userWithGoogle?.accounts?.[0]) {
        return NextResponse.json(
          { error: 'No Google account linked. Please sign in with Google first.' },
          { status: 400 }
        )
      }

      // Create or update calendar settings
      await db.googleCalendarSettings.upsert({
        where: { householdId: session.user.householdId },
        create: {
          householdId: session.user.householdId,
          connectedUserId: session.user.id,
          showOnPlanner: true,
        },
        update: {
          connectedUserId: session.user.id,
        },
      })

      return NextResponse.json({ success: true })
    }

    if (action === 'disconnect') {
      // Disconnect calendar (but keep the settings record)
      await db.googleCalendarSettings.update({
        where: { householdId: session.user.householdId },
        data: {
          connectedUserId: null,
        },
      })

      return NextResponse.json({ success: true })
    }

    if (action === 'unlinkGoogle') {
      // Fully remove Google OAuth tokens to force re-authentication with new scopes
      await db.account.deleteMany({
        where: {
          userId: session.user.id,
          provider: 'google',
        },
      })

      // Also disconnect calendar settings
      await db.googleCalendarSettings.updateMany({
        where: { connectedUserId: session.user.id },
        data: { connectedUserId: null },
      })

      return NextResponse.json({ success: true })
    }

    if (action === 'fetchCalendars') {
      // Fetch available calendars from Google and cache them
      const calendars = await getAvailableCalendars(session.user.householdId)

      if (calendars.length === 0) {
        return NextResponse.json(
          { error: 'No calendars found or calendar not connected' },
          { status: 400 }
        )
      }

      // Cache the available calendars in the database
      await db.googleCalendarSettings.update({
        where: { householdId: session.user.householdId },
        data: {
          availableCalendars: calendars as unknown as Prisma.InputJsonValue,
        },
      })

      return NextResponse.json({ success: true, calendars })
    }

    // Update settings
    if (showOnPlanner !== undefined || calendarIds !== undefined) {
      await db.googleCalendarSettings.upsert({
        where: { householdId: session.user.householdId },
        create: {
          householdId: session.user.householdId,
          showOnPlanner: showOnPlanner ?? true,
          calendarIds: calendarIds ?? ['primary'],
        },
        update: {
          ...(showOnPlanner !== undefined && { showOnPlanner }),
          ...(calendarIds !== undefined && { calendarIds }),
        },
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  } catch (error) {
    console.error('Error updating calendar settings:', error)
    return NextResponse.json(
      { error: 'Failed to update calendar settings' },
      { status: 500 }
    )
  }
}
