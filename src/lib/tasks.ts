import { devices } from '../data/patient'
import type { LogEntry } from '../types'
import { isSameDay } from './sessions'

export interface Task {
  deviceId: string
  sessionId: string
  title: string
  time: string
  done: boolean
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
      tasks.push({
        deviceId: device.id,
        sessionId: session.id,
        title: `${device.name} — ${session.label}`,
        time: session.scheduledTime || '',
        done,
      })
    }
  }
  tasks.sort((a, b) => a.time.localeCompare(b.time))
  return tasks
}
