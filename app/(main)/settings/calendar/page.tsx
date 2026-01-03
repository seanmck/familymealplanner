import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { CalendarSettings } from './calendar-settings'
import { CalendarInfo } from '@/lib/google-calendar'

export default async function CalendarSettingsPage() {
  const session = await auth()
  if (!session?.user?.householdId) {
    redirect('/login')
  }

  // Check if current user has a Google account linked
  const userWithGoogle = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      accounts: {
        where: { provider: 'google' },
        select: { id: true },
      },
    },
  })

  const hasGoogleAccount = (userWithGoogle?.accounts?.length ?? 0) > 0

  // Get calendar settings for the household
  const settings = await db.googleCalendarSettings.findUnique({
    where: { householdId: session.user.householdId },
    include: {
      connectedUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })

  const isConnectedByCurrentUser = settings?.connectedUserId === session.user.id

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Google Calendar</h1>
        <p className="text-muted-foreground mt-2">
          Connect your Google Calendar to see upcoming events on your meal planner.
        </p>
      </div>
      <CalendarSettings
        hasGoogleAccount={hasGoogleAccount}
        isConnected={!!settings?.connectedUserId}
        isConnectedByCurrentUser={isConnectedByCurrentUser}
        connectedUserName={settings?.connectedUser?.name || settings?.connectedUser?.email}
        showOnPlanner={settings?.showOnPlanner ?? true}
        calendarIds={settings?.calendarIds ?? ['primary']}
        availableCalendars={(settings?.availableCalendars as CalendarInfo[] | null) ?? []}
      />
    </div>
  )
}
