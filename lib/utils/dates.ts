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
