// HARDCODED: demo seed data — caregivers, past logs, past handoffs.
// Generated relative to "now" so the calendar and history always look recent.

import { mockSummary } from '../lib/ai-client'
import type { AppState, Caregiver, FieldValue, Handoff, LogEntry } from '../types'
import { devices } from './patient'

export const seedCaregivers: Caregiver[] = [
  { id: 'mom', name: 'Mom', color: '#ff6fa8' },
  { id: 'nurse-alex', name: 'Nurse Alex', color: '#5bc0eb' },
  { id: 'dad', name: 'Dad', color: '#9b5de5' },
]

// Typical values for number fields
const typicalNumbers: Record<string, number> = {
  minutes: 30,
  infused: 900,
  rate: 75,
  loaded: 900,
}

// A few example notes, keyed by "deviceId:sessionId"
const sampleNotes: Record<string, string> = {
  'nebulizer:evening': 'Coughed a lot after saline, settled after 10 min.',
  'feeding-pump:bedtime-start': 'Small leak at extension set, reconnected.',
}

const SHIFTS_BACK = 6 // 12-hour shifts = 3 days of history

function lastBoundary(now: Date): Date {
  const b = new Date(now)
  b.setMinutes(0, 0, 0)
  if (now.getHours() >= 19) {
    b.setHours(19)
  } else if (now.getHours() >= 7) {
    b.setHours(7)
  } else {
    b.setDate(b.getDate() - 1)
    b.setHours(19)
  }
  return b
}

export function makeSeed(now: Date = new Date()): AppState {
  const logs: LogEntry[] = []
  const handoffs: Handoff[] = []
  let end = lastBoundary(now)

  for (let i = 0; i < SHIFTS_BACK; i++) {
    const start = new Date(end.getTime() - 12 * 3600 * 1000)
    let caregiverId = 'mom'
    if (start.getHours() === 7) {
      caregiverId = 'nurse-alex'
    }

    const shiftLogs: LogEntry[] = []
    for (const day of [start, end]) {
      for (const device of devices) {
        for (const session of device.sessions) {
          if (session.recurrence !== 'daily' || !session.scheduledTime) {
            continue
          }
          const [h, m] = session.scheduledTime.split(':').map(Number)
          const t = new Date(day)
          t.setHours(h, m + 4, 0, 0) // logged a few minutes after the planned time
          if (t < start || t >= end) {
            continue
          }
          const values: Record<string, FieldValue> = {}
          for (const field of session.fields) {
            if (field.type === 'check') {
              values[field.id] = true
            } else if (field.type === 'number') {
              values[field.id] = typicalNumbers[field.id] || 0
            }
          }
          values.notes = sampleNotes[`${device.id}:${session.id}`] || ''
          shiftLogs.push({
            id: `seed-${device.id}-${session.id}-${t.getTime()}`,
            deviceId: device.id,
            sessionId: session.id,
            caregiverId,
            timestamp: t.toISOString(),
            values,
          })
        }
      }
    }

    // Remove duplicates (a time can match both start and end day at midnight edges)
    const unique = shiftLogs.filter((l, idx) => shiftLogs.findIndex((x) => x.id === l.id) === idx)
    logs.push(...unique)

    const overallNotes = ''
    handoffs.push({
      id: `seed-handoff-${start.getTime()}`,
      caregiverId,
      start: start.toISOString(),
      end: end.toISOString(),
      overallNotes,
      logIds: unique.map((l) => l.id),
      summaryBullets: mockSummary(unique, overallNotes),
    })
    end = start
  }

  return {
    caregivers: seedCaregivers,
    currentShift: null,
    logs,
    handoffs, // newest first
  }
}
