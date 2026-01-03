'use client'

import { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Calendar, Clock, MapPin, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { CalendarEvent } from '@/lib/google-calendar'

interface CalendarEventsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: Date
}

export function CalendarEventsDialog({
  open,
  onOpenChange,
  date,
}: CalendarEventsDialogProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      fetchEvents()
    }
  }, [open, date])

  const fetchEvents = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/calendar/events?date=${date.toISOString()}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch events')
      }

      const data = await response.json()
      setEvents(data.events || [])
    } catch (err) {
      console.error('Error fetching calendar events:', err)
      setError('Failed to load events')
    } finally {
      setLoading(false)
    }
  }

  const formatEventTime = (event: CalendarEvent) => {
    if (event.allDay) {
      return 'All day'
    }

    const start = parseISO(event.start)
    const end = parseISO(event.end)

    return `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`
  }

  // Separate all-day events from timed events
  const allDayEvents = events.filter((e) => e.allDay)
  const timedEvents = events.filter((e) => !e.allDay)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            {format(date, 'EEEE, MMMM d')}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <div className="text-center py-8 text-muted-foreground">
              {error}
            </div>
          )}

          {!loading && !error && events.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No events scheduled for this day
            </div>
          )}

          {!loading && !error && events.length > 0 && (
            <div className="space-y-4">
              {allDayEvents.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium uppercase text-muted-foreground">
                    All Day
                  </h4>
                  {allDayEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              )}

              {timedEvents.length > 0 && (
                <div className="space-y-2">
                  {allDayEvents.length > 0 && (
                    <h4 className="text-xs font-medium uppercase text-muted-foreground">
                      Scheduled
                    </h4>
                  )}
                  {timedEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      timeDisplay={formatEventTime(event)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function EventCard({
  event,
  timeDisplay,
}: {
  event: CalendarEvent
  timeDisplay?: string
}) {
  return (
    <div className="rounded-lg border bg-card p-3 space-y-1">
      <h5 className="font-medium text-sm">{event.summary}</h5>

      {timeDisplay && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {timeDisplay}
        </div>
      )}

      {event.location && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span className="truncate">{event.location}</span>
        </div>
      )}
    </div>
  )
}
