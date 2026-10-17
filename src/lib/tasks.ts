import { devices } from '../data/patient'
import type { LogEntry } from '../types'
import { isSameDay } from './sessions'

export interface Task {
  deviceId: string
  sessionId: string
  title: string
  group: 'morning' | 'evening' | 'bedtime'
  time: string
  done: boolean
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
      tasks.push({
        deviceId: device.id,
        sessionId: session.id,
        title: device.name,
        group: taskGroup(session.id),
        time: session.scheduledTime || '',
        done,
      })
    }
  }
  const groupOrder: Record<Task['group'], number> = { morning: 0, evening: 1, bedtime: 2 }
  tasks.sort((a, b) => groupOrder[a.group] - groupOrder[b.group] || a.time.localeCompare(b.time))
  return tasks
}
