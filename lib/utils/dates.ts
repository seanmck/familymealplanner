export function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export function formatWeekRange(monday: Date): string {
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const monthFormat = new Intl.DateTimeFormat('en-US', { month: 'short' })
  const dayFormat = new Intl.DateTimeFormat('en-US', { day: 'numeric' })

  const startMonth = monthFormat.format(monday)
  const endMonth = monthFormat.format(sunday)

  if (startMonth === endMonth) {
    return `${startMonth} ${dayFormat.format(monday)} - ${dayFormat.format(sunday)}`
  }
  return `${startMonth} ${dayFormat.format(monday)} - ${endMonth} ${dayFormat.format(sunday)}`
}

export function addWeeks(date: Date, weeks: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + weeks * 7)
  return d
}

export const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

/**
 * Format date as YYYY-MM-DD for use in URLs
 */
export function formatDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Parse YYYY-MM-DD string to Date at midnight local time
 */
export function parseDateString(dateStr: string): Date | null {
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const [, year, month, day] = match
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
  // Verify the date is valid (handles cases like 2024-02-30)
  if (date.getFullYear() !== parseInt(year) ||
      date.getMonth() !== parseInt(month) - 1 ||
      date.getDate() !== parseInt(day)) {
    return null
  }
  return date
}

/**
 * Get day of week as 0-6 (Monday=0, Sunday=6) to match DAYS_OF_WEEK array
 */
export function getDayOfWeek(date: Date): number {
  const day = date.getDay()
  return day === 0 ? 6 : day - 1
}

/**
 * Add (or subtract) days from a date
 */
export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

/**
 * Format date for display: "Wednesday, January 15"
 */
export function formatDayDisplay(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}
