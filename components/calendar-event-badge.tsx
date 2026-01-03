'use client'

import { Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CalendarEventBadgeProps {
  count: number
  hasAllDay?: boolean
  onClick: () => void
  className?: string
}

export function CalendarEventBadge({
  count,
  hasAllDay,
  onClick,
  className,
}: CalendarEventBadgeProps) {
  if (count === 0) {
    return null
  }

  return (
    <button
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onClick()
      }}
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md',
        'text-xs font-medium',
        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        'hover:bg-blue-200 dark:hover:bg-blue-900/50',
        'transition-colors cursor-pointer',
        className
      )}
      title={`${count} calendar event${count !== 1 ? 's' : ''}${hasAllDay ? ' (includes all-day)' : ''}`}
    >
      <Calendar className="h-3 w-3" />
      <span>{count}</span>
    </button>
  )
}
