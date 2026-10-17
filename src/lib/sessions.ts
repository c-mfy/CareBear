import { fromDateInput } from './format'
import type { Device, Session } from '../types'

/** Auto-pick the session for the current time. Quarterly sessions are never auto-picked. */
export function pickSession(device: Device, now: Date = new Date()): Session {
  const hour = now.getHours()
  const match = device.sessions.find(
    (s) => s.recurrence === 'daily' && hour >= s.startHour && hour < s.endHour,
  )
  if (match) {
    return match
  }
  return device.sessions[0]
}

/** Date the next G-tube button change is due (3 months after the last one). */
export function quarterlyDueDate(lastChangeIso: string): Date {
  const due = fromDateInput(lastChangeIso) // local date, not UTC midnight
  due.setMonth(due.getMonth() + 3)
  return due
}

/** "18:15" -> today's Date at that time */
export function timeToday(hhmm: string, base: Date = new Date()): Date {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date(base)
  d.setHours(h, m, 0, 0)
  return d
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString()
}
