'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar, Check, Loader2, Link2, Link2Off, Chrome, RefreshCw } from 'lucide-react'
import { CalendarInfo } from '@/lib/google-calendar'

interface CalendarSettingsProps {
  hasGoogleAccount: boolean
  isConnected: boolean
  isConnectedByCurrentUser: boolean
  connectedUserName?: string | null
  showOnPlanner: boolean
  calendarIds: string[]
  availableCalendars: CalendarInfo[]
}

export function CalendarSettings({
  hasGoogleAccount,
  isConnected,
  isConnectedByCurrentUser,
  connectedUserName,
  showOnPlanner: initialShowOnPlanner,
  calendarIds: initialCalendarIds,
  availableCalendars: initialAvailableCalendars,
}: CalendarSettingsProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showOnPlanner, setShowOnPlanner] = useState(initialShowOnPlanner)
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>(initialCalendarIds)
  const [availableCalendars, setAvailableCalendars] = useState<CalendarInfo[]>(initialAvailableCalendars)

  // Fetch calendars when first connected and no calendars are cached
  useEffect(() => {
    if (isConnected && availableCalendars.length === 0) {
      handleRefreshCalendars()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected])

  const handleConnect = async () => {
    if (!hasGoogleAccount) {
      await signIn('google', { callbackUrl: '/settings/calendar' })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/calendar/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'connect' }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to connect calendar')
      }

      // Fetch calendars after connecting
      await handleRefreshCalendars()
      router.refresh()
    } catch (error) {
      console.error('Failed to connect calendar:', error)
      alert(error instanceof Error ? error.message : 'Failed to connect calendar')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisconnect = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/calendar/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disconnect' }),
      })

      if (!response.ok) {
        throw new Error('Failed to disconnect calendar')
      }

      router.refresh()
    } catch (error) {
      console.error('Failed to disconnect calendar:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUnlinkGoogle = async () => {
    if (!confirm('This will remove your Google account link. You will need to sign in with Google again to reconnect your calendar.')) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/calendar/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unlinkGoogle' }),
      })

      if (!response.ok) {
        throw new Error('Failed to unlink Google account')
      }

      router.refresh()
    } catch (error) {
      console.error('Failed to unlink Google account:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefreshCalendars = async () => {
    setIsRefreshing(true)
    try {
      const response = await fetch('/api/calendar/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fetchCalendars' }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.calendars) {
          setAvailableCalendars(data.calendars)
        }
      }
    } catch (error) {
      console.error('Failed to refresh calendars:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleToggleVisibility = async (checked: boolean) => {
    setShowOnPlanner(checked)
    try {
      await fetch('/api/calendar/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showOnPlanner: checked }),
      })
    } catch (error) {
      console.error('Failed to update setting:', error)
      setShowOnPlanner(!checked)
    }
  }

  const handleCalendarToggle = async (calendarId: string, checked: boolean) => {
    const newSelectedIds = checked
      ? [...selectedCalendarIds, calendarId]
      : selectedCalendarIds.filter(id => id !== calendarId)

    // Ensure at least one calendar is selected
    if (newSelectedIds.length === 0) {
      return
    }

    setSelectedCalendarIds(newSelectedIds)

    try {
      await fetch('/api/calendar/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calendarIds: newSelectedIds }),
      })
    } catch (error) {
      console.error('Failed to update calendar selection:', error)
      setSelectedCalendarIds(selectedCalendarIds) // Revert
    }
  }

  return (
    <div className="space-y-6">
      {/* Connection Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Calendar Connection
          </CardTitle>
          <CardDescription>
            {isConnected
              ? `Connected to ${connectedUserName || 'Google Calendar'}`
              : 'Connect your Google Calendar to display events on your meal planner'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isConnected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400">
                <Check className="h-5 w-5" />
                <div className="flex-1">
                  <p className="font-medium">Calendar connected</p>
                  <p className="text-sm opacity-80">
                    Events from {connectedUserName}&apos;s calendar will appear on your planner
                  </p>
                </div>
              </div>

              {isConnectedByCurrentUser && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={handleDisconnect}
                    disabled={isLoading}
                    className="gap-2"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Link2Off className="h-4 w-4" />
                    )}
                    Disconnect Calendar
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handleUnlinkGoogle}
                    disabled={isLoading}
                    className="gap-2 text-muted-foreground"
                  >
                    Re-authorize Google
                  </Button>
                </div>
              )}

              {!isConnectedByCurrentUser && (
                <p className="text-sm text-muted-foreground">
                  Only {connectedUserName} can disconnect this calendar.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {!hasGoogleAccount && (
                <p className="text-sm text-muted-foreground">
                  You&apos;ll need to sign in with Google to connect your calendar.
                </p>
              )}

              <Button
                onClick={handleConnect}
                disabled={isLoading}
                className="gap-2"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : hasGoogleAccount ? (
                  <Link2 className="h-4 w-4" />
                ) : (
                  <Chrome className="h-4 w-4" />
                )}
                {hasGoogleAccount ? 'Connect Calendar' : 'Sign in with Google'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calendar Selection Card */}
      {isConnected && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Select Calendars</CardTitle>
                <CardDescription>
                  Choose which calendars to display on your meal planner
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefreshCalendars}
                disabled={isRefreshing}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {availableCalendars.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4 text-center">
                {isRefreshing ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading calendars...
                  </div>
                ) : (
                  'No calendars found. Click refresh to load your calendars.'
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {availableCalendars.map((cal) => (
                  <div key={cal.id} className="flex items-center space-x-3">
                    <Checkbox
                      id={`cal-${cal.id}`}
                      checked={selectedCalendarIds.includes(cal.id)}
                      onCheckedChange={(checked) =>
                        handleCalendarToggle(cal.id, checked as boolean)
                      }
                      disabled={
                        selectedCalendarIds.length === 1 &&
                        selectedCalendarIds.includes(cal.id)
                      }
                    />
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: cal.backgroundColor }}
                    />
                    <Label
                      htmlFor={`cal-${cal.id}`}
                      className="flex-1 cursor-pointer font-normal"
                    >
                      {cal.summary}
                      {cal.primary && (
                        <span className="ml-2 text-xs text-muted-foreground">(Primary)</span>
                      )}
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Display Settings Card */}
      {isConnected && (
        <Card>
          <CardHeader>
            <CardTitle>Display Settings</CardTitle>
            <CardDescription>
              Configure how calendar events appear on your planner
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="show-on-planner">Show on planner</Label>
                <p className="text-sm text-muted-foreground">
                  Display event counts on day cards in the weekly view
                </p>
              </div>
              <Switch
                id="show-on-planner"
                checked={showOnPlanner}
                onCheckedChange={handleToggleVisibility}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
