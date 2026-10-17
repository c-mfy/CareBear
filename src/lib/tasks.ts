import { devices } from '../data/patient'
import type { LogEntry } from '../types'
import { formatMinutes, formatTime } from './format'
import { isSameDay, timeToday } from './sessions'

/** Minutes past the scheduled time before a task counts as overdue */
export const OVERDUE_GRACE_MINUTES = 30

export interface Task {
  deviceId: string
  sessionId: string
  title: string
  /** Session label, e.g. "Evening dose" */
  label: string
  group: 'morning' | 'evening' | 'bedtime'
  time: string
  done: boolean
  /** Minutes past the scheduled time, once past the grace period; 0 = not overdue */
  overdueMinutes: number
}

function taskGroup(sessionId: string): Task['group'] {
  if (sessionId === 'bedtime-start') {
    return 'bedtime'
  }
  if (sessionId.includes('evening')) {
    return 'evening'
  }
  return 'morning'
}

/** Today's to-do list: every daily session, checked off if it was logged today. */
export function buildTodayTasks(logs: LogEntry[], now: Date = new Date()): Task[] {
  const tasks: Task[] = []
  for (const device of devices) {
    for (const session of device.sessions) {
      if (session.recurrence !== 'daily') {
        continue
      }
      const done = logs.some(
        (l) =>
          l.deviceId === device.id &&
          l.sessionId === session.id &&
          isSameDay(new Date(l.timestamp), now),
      )
      let overdueMinutes = 0
      if (!done && session.scheduledTime) {
        const late = Math.floor((now.getTime() - timeToday(session.scheduledTime, now).getTime()) / 60000)
        if (late >= OVERDUE_GRACE_MINUTES) {
          overdueMinutes = late
        }
      }
      tasks.push({
        deviceId: device.id,
        sessionId: session.id,
        title: device.name,
        label: session.label,
        group: taskGroup(session.id),
        time: session.scheduledTime || '',
        done,
        overdueMinutes,
      })
    }
  }
  const groupOrder: Record<Task['group'], number> = { morning: 0, evening: 1, bedtime: 2 }
  tasks.sort((a, b) => groupOrder[a.group] - groupOrder[b.group] || a.time.localeCompare(b.time))
  return tasks
}

export interface OverdueItem {
  title: string
  label: string
  /** When it was due */
  scheduled: Date
  /** Minutes late it was logged; null = still not done */
  minutesLate: number | null
}

/**
 * Daily sessions that went overdue during a shift: their grace deadline fell between the shift start and
 * now, and they were either never logged that day or logged after the deadline.
 */
export function overdueDuringShift(logs: LogEntry[], shiftStart: Date, now: Date = new Date()): OverdueItem[] {
  const items: OverdueItem[] = []
  const day = new Date(shiftStart)
  day.setHours(0, 0, 0, 0)
  for (; day <= now; day.setDate(day.getDate() + 1)) {
    for (const device of devices) {
      for (const session of device.sessions) {
        if (session.recurrence !== 'daily' || !session.scheduledTime) {
          continue
        }
        const scheduled = timeToday(session.scheduledTime, day)
        const deadline = new Date(scheduled.getTime() + OVERDUE_GRACE_MINUTES * 60000)
        if (deadline < shiftStart || deadline > now) {
          continue
        }
        const log = logs.find(
          (l) => l.deviceId === device.id && l.sessionId === session.id && isSameDay(new Date(l.timestamp), scheduled),
        )
        if (log && new Date(log.timestamp) <= deadline) {
          continue // on time
        }
        let minutesLate: number | null = null
        if (log) {
          minutesLate = Math.floor((new Date(log.timestamp).getTime() - scheduled.getTime()) / 60000)
        }
        items.push({ title: device.name, label: session.label, scheduled, minutesLate })
      }
    }
  }
  return items.sort((a, b) => a.scheduled.getTime() - b.scheduled.getTime())
}

/** "Vest · Morning session: not done (due 7:15 AM)" / "...: logged 1 hr 10 min late" */
export function describeOverdue(item: OverdueItem): string {
  let status = `not done (due ${formatTime(item.scheduled.toISOString())})`
  if (item.minutesLate !== null) {
    status = `logged ${formatMinutes(item.minutesLate)} late`
  }
  return `${item.title} · ${item.label}: ${status}`
}
