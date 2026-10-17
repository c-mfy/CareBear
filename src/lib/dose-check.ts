// Double-dose check: warn before logging something that was already logged.

import type { Device, LogEntry, Session } from '../types'
import { isSameDay } from './sessions'

/** Medication logged this recently (any session) also triggers the warning, e.g. morning dose given late */
export const MIN_DOSE_GAP_HOURS = 8

export interface DoseConflict {
  log: LogEntry
  /** 'same-session': this session was already logged today; 'recent-dose': medication given < MIN_DOSE_GAP_HOURS ago */
  reason: 'same-session' | 'recent-dose'
}

export function findDoseConflict(
  device: Device,
  session: Session,
  logs: LogEntry[],
  now: Date = new Date(),
): DoseConflict | null {
  if (session.recurrence !== 'daily') {
    return null
  }
  const deviceLogs = logs
    .filter((l) => l.deviceId === device.id)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))

  const sameSession = deviceLogs.find(
    (l) => l.sessionId === session.id && isSameDay(new Date(l.timestamp), now),
  )
  if (sameSession) {
    return { log: sameSession, reason: 'same-session' }
  }
  if (device.medication) {
    const cutoff = now.getTime() - MIN_DOSE_GAP_HOURS * 3600 * 1000
    // a log with "Dose given" unchecked isn't a dose
    const recent = deviceLogs.find((l) => new Date(l.timestamp).getTime() >= cutoff && l.values.given !== false)
    if (recent) {
      return { log: recent, reason: 'recent-dose' }
    }
  }
  return null
}
