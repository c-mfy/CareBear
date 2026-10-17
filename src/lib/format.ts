import { getDevice } from '../data/patient'
import type { LogEntry } from '../types'

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString([], {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatScheduled(hhmm: string): string {
  if (!hhmm) {
    return ''
  }
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

/** One-line plain description of a log, e.g. "Albuterol given, Parts rinsed · 30 min" */
export function describeLog(log: LogEntry): string {
  const device = getDevice(log.deviceId)
  const session = device?.sessions.find((s) => s.id === log.sessionId)
  if (!device || !session) {
    return 'Unknown entry'
  }
  const parts: string[] = []
  const missed: string[] = []
  for (const field of session.fields) {
    const value = log.values[field.id]
    if (field.type === 'check') {
      if (value === true) {
        parts.push(field.label)
      } else {
        missed.push(field.label)
      }
    } else if (field.type === 'number') {
      if (typeof value === 'number') {
        let unit = ''
        if (field.unit) {
          unit = ' ' + field.unit
        }
        parts.push(`${field.label} ${value}${unit}`)
      }
    }
  }
  let text = parts.join(', ')
  if (missed.length > 0) {
    text += ` · NOT done: ${missed.join(', ')}`
  }
  return text
}

export function logNotes(log: LogEntry): string {
  const value = log.values.notes
  if (typeof value === 'string') {
    return value.trim()
  }
  return ''
}
