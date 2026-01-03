import { google, calendar_v3 } from 'googleapis'
import { db } from '@/lib/db'

export interface CalendarEvent {
  id: string
  summary: string
  start: string // ISO datetime or date
  end: string
  allDay: boolean
  location?: string
  calendarId?: string
  calendarName?: string
  calendarColor?: string
}

export interface CalendarInfo {
  id: string
  summary: string
  backgroundColor: string
  primary: boolean
}

export interface WeekCalendarData {
  [dayOfWeek: number]: {
    count: number
    hasAllDay: boolean
  }
}

/**
 * Get an authenticated Google Calendar client for a household.
 * Handles token refresh automatically.
 */
export async function getCalendarClient(
  householdId: string
): Promise<calendar_v3.Calendar | null> {
  // Get the calendar settings for this household
  const settings = await db.googleCalendarSettings.findUnique({
    where: { householdId },
    include: {
      connectedUser: {
        include: {
          accounts: {
            where: { provider: 'google' },
          },
        },
      },
    },
  })

  if (!settings?.connectedUser?.accounts?.[0]) {
    return null
  }

  const account = settings.connectedUser.accounts[0]

  if (!account.access_token) {
    return null
  }

  // Create OAuth2 client
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )

  // Check if token is expired
  const now = Math.floor(Date.now() / 1000)
  const isExpired = account.expires_at && account.expires_at < now

  if (isExpired && account.refresh_token) {
    // Refresh the token
    oauth2Client.setCredentials({
      refresh_token: account.refresh_token,
    })

    try {
      const { credentials } = await oauth2Client.refreshAccessToken()

      // Update the account with new tokens
      await db.account.update({
        where: { id: account.id },
        data: {
          access_token: credentials.access_token,
          expires_at: credentials.expiry_date
            ? Math.floor(credentials.expiry_date / 1000)
            : undefined,
        },
      })

      oauth2Client.setCredentials(credentials)
    } catch (error) {
      console.error('Failed to refresh Google token:', error)
      return null
    }
  } else {
    oauth2Client.setCredentials({
      access_token: account.access_token,
      refresh_token: account.refresh_token,
    })
  }

  return google.calendar({ version: 'v3', auth: oauth2Client })
}

/**
 * Fetch list of available calendars for the connected user.
 * Returns calendars the user has at least read access to.
 */
export async function getAvailableCalendars(
  householdId: string
): Promise<CalendarInfo[]> {
  const calendar = await getCalendarClient(householdId)
  if (!calendar) {
    return []
  }

  try {
    const response = await calendar.calendarList.list({
      minAccessRole: 'reader',
    })

    return (
      response.data.items?.map((cal) => ({
        id: cal.id!,
        summary: cal.summary || cal.id!,
        backgroundColor: cal.backgroundColor || '#4285f4',
        primary: cal.primary || false,
      })) || []
    )
  } catch (error) {
    console.error('Failed to fetch calendar list:', error)
    return []
  }
}

/**
 * Fetch calendar events for a date range from all selected calendars.
 */
export async function getEventsForDateRange(
  householdId: string,
  startDate: Date,
  endDate: Date
): Promise<CalendarEvent[]> {
  const settings = await db.googleCalendarSettings.findUnique({
    where: { householdId },
  })

  if (!settings?.showOnPlanner) {
    return []
  }

  const calendar = await getCalendarClient(householdId)
  if (!calendar) {
    return []
  }

  // Get selected calendar IDs, default to primary if none selected
  const calendarIds = settings.calendarIds?.length > 0
    ? settings.calendarIds
    : ['primary']

  // Build a map of calendar info for adding metadata to events
  const availableCalendars = (settings.availableCalendars as CalendarInfo[] | null) || []
  const calendarMap = new Map(availableCalendars.map(c => [c.id, c]))

  try {
    // Fetch events from all selected calendars in parallel
    const eventPromises = calendarIds.map(async (calendarId) => {
      try {
        const response = await calendar.events.list({
          calendarId,
          timeMin: startDate.toISOString(),
          timeMax: endDate.toISOString(),
          singleEvents: true,
          orderBy: 'startTime',
          maxResults: 100,
        })

        const calInfo = calendarMap.get(calendarId)

        return (
          response.data.items?.map((event) => ({
            id: event.id!,
            summary: event.summary || 'Untitled',
            start: event.start?.dateTime || event.start?.date || '',
            end: event.end?.dateTime || event.end?.date || '',
            allDay: !!event.start?.date,
            location: event.location || undefined,
            calendarId,
            calendarName: calInfo?.summary || calendarId,
            calendarColor: calInfo?.backgroundColor || '#4285f4',
          })) || []
        )
      } catch (error) {
        console.error(`Failed to fetch events from calendar ${calendarId}:`, error)
        return []
      }
    })

    const allEvents = await Promise.all(eventPromises)

    // Flatten and sort by start time
    return allEvents
      .flat()
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
  } catch (error) {
    console.error('Failed to fetch calendar events:', error)
    return []
  }
}

/**
 * Get event counts per day for a week (for compact badge display).
 */
export async function getWeekEventCounts(
  householdId: string,
  weekStart: Date
): Promise<WeekCalendarData> {
  // Calculate week end (Sunday)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)

  const events = await getEventsForDateRange(householdId, weekStart, weekEnd)

  // Initialize all days with zero counts
  const data: WeekCalendarData = {}
  for (let i = 0; i < 7; i++) {
    data[i] = { count: 0, hasAllDay: false }
  }

  // Count events per day
  for (const event of events) {
    const eventStart = new Date(event.start)
    const dayOfWeek = getDayOfWeek(eventStart, weekStart)

    if (dayOfWeek >= 0 && dayOfWeek < 7) {
      data[dayOfWeek].count++
      if (event.allDay) {
        data[dayOfWeek].hasAllDay = true
      }
    }
  }

  return data
}

/**
 * Get events for a specific day.
 */
export async function getEventsForDay(
  householdId: string,
  date: Date
): Promise<CalendarEvent[]> {
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)

  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)

  return getEventsForDateRange(householdId, startOfDay, endOfDay)
}

/**
 * Get day of week (0 = Monday) relative to week start.
 */
function getDayOfWeek(date: Date, weekStart: Date): number {
  const diffTime = date.getTime() - weekStart.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

/**
 * Check if a household has a connected Google Calendar.
 */
export async function isCalendarConnected(
  householdId: string
): Promise<boolean> {
  const settings = await db.googleCalendarSettings.findUnique({
    where: { householdId },
    include: {
      connectedUser: {
        include: {
          accounts: {
            where: { provider: 'google' },
          },
        },
      },
    },
  })

  return !!settings?.connectedUser?.accounts?.[0]?.access_token
}
