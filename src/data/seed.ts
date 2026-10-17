// HARDCODED: demo seed data — caregivers, past logs, past handoffs.
// Generated relative to "now" so the calendar and history always look recent.

import { mockSummary } from '../lib/ai-client'
import { toDateInput } from '../lib/format'
import { isSameDay, timeToday } from '../lib/sessions'
import { describeOverdue, overdueDuringShift } from '../lib/tasks'
import type { AppState, Caregiver, FieldValue, Handoff, LogEntry } from '../types'
import { DOOR_TAG_ID, devices } from './patient'

export const seedCaregivers: Caregiver[] = [
  { id: 'mom', name: 'Mom', color: '#f392ba', role: 'family' },
  { id: 'nurse-alex', name: 'Nurse Alex', color: '#1bb3b0', role: 'staff' },
  { id: 'dad', name: 'Dad', color: '#755339', role: 'family' },
]

// Prescribed values: the same every time (they only change with a new order)
const prescribed: Record<string, number> = {
  rate: 75, // pump rate, mL/hr
  loaded: 900, // overnight feed volume, mL
}

// Vest minutes vary a little with how cooperative Maya is
const vestMinutes = [30, 30, 30, 25, 30, 35, 20, 30]

const PUMP_ALARM_NOTE = 'Pump alarmed (occlusion) around 3 AM. Flushed the tube and restarted.'
const LEAK_NOTE = 'Small leak at extension set, reconnected.'
const COUGH_NOTE = 'Coughed a lot after saline, settled after 10 min.'

const SHIFTS_BACK = 10 // 12-hour shifts = 5 days of history
const LATE_CHANGEOVER = 3 // this changeover (counting back from the latest) ran over an hour late

/** Small seeded random generator, so the demo data is the same after every reset. */
function seededRandom(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

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

/** Day shifts: Nurse Alex on weekdays, Dad on weekends. Nights: Mom. */
function caregiverFor(start: Date): string {
  if (start.getHours() !== 7) {
    return 'mom'
  }
  const weekend = start.getDay() === 0 || start.getDay() === 6
  return weekend ? 'dad' : 'nurse-alex'
}

export function makeSeed(now: Date = new Date()): AppState {
  const random = seededRandom(20261017)
  const logs: LogEntry[] = []
  const shifts: { start: Date; end: Date; caregiverId: string; logs: LogEntry[] }[] = []
  const MIN = 60000

  // Shifts nominally change at 7:00, but real check-outs land a little before or after, and the next
  // caregiver checks in a few minutes later. changeovers[k] is the k-th 7:00 counting back from the latest.
  const changeovers = Array.from({ length: SHIFTS_BACK + 1 }, (_, k) => {
    const nominal = lastBoundary(now).getTime() - k * 12 * 3600 * 1000
    let checkout = nominal + (-12 + Math.floor(random() * 38)) * MIN // about 6:48 to 7:25
    if (k === LATE_CHANGEOVER) {
      checkout += 70 * MIN // stayed late
    }
    checkout = Math.min(checkout, now.getTime() - MIN) // the latest one can't be in the future
    return { checkout: new Date(checkout), checkin: new Date(checkout + (2 + Math.floor(random() * 8)) * MIN) }
  })

  let nominalEnd = lastBoundary(now)
  let dayShifts = 0
  let nightShifts = 0

  for (let i = 0; i < SHIFTS_BACK; i++) {
    const nominalStart = new Date(nominalEnd.getTime() - 12 * 3600 * 1000)
    const start = changeovers[i + 1].checkin
    const end = changeovers[i].checkout
    // Sessions due between the previous caregiver leaving and this one arriving fall to this shift
    const coversFrom = changeovers[i + 1].checkout
    const caregiverId = caregiverFor(nominalStart)
    const isDay = nominalStart.getHours() === 7
    if (isDay) {
      dayShifts++
    } else {
      nightShifts++
    }
    // A few scripted events, placed in past shifts (not the latest) so they show up in history
    const missVestEvening = isDay && dayShifts === 2
    const lateTrikaftaEvening = !isDay && nightShifts === 2
    const pumpAlarm = !isDay && (nightShifts === 3 || nightShifts === 5)

    const shiftLogs: LogEntry[] = []
    // the calendar days this shift touches (a day shift is one day, a night shift two)
    const days = isSameDay(coversFrom, end) ? [coversFrom] : [coversFrom, end]
    for (const day of days) {
      for (const device of devices) {
        for (const session of device.sessions) {
          if (session.recurrence !== 'daily' || !session.scheduledTime) {
            continue
          }
          const key = `${device.id}:${session.id}`
          const scheduled = timeToday(session.scheduledTime, day)
          if (scheduled < coversFrom || scheduled >= end) {
            continue // another shift's session
          }
          let late = 1 + Math.floor(random() * 16) // logged a few minutes after the planned time
          if (key === 'trikafta:evening' && lateTrikaftaEvening) {
            late += 70
          }
          // inside this shift: not before check-in, not after check-out
          const t = new Date(
            Math.min(Math.max(scheduled.getTime() + late * MIN, start.getTime() + 2 * MIN), end.getTime() - MIN),
          )
          if (key === 'vest:evening' && missVestEvening) {
            continue
          }

          const values: Record<string, FieldValue> = {}
          for (const field of session.fields) {
            if (field.type === 'check') {
              values[field.id] = true
            } else if (field.type === 'number') {
              values[field.id] = prescribed[field.id] ?? 0
            }
          }
          let notes = ''
          if (device.id === 'vest') {
            values.minutes = vestMinutes[Math.floor(random() * vestMinutes.length)]
          }
          if (key === 'feeding-pump:morning-stop') {
            // what actually went in: the full 900 mL unless the pump alarmed overnight
            values.infused = pumpAlarm ? 760 + Math.round(random() * 6) * 10 : prescribed.loaded
            if (pumpAlarm) {
              notes = PUMP_ALARM_NOTE
            }
          }
          if (key === 'feeding-pump:bedtime-start' && random() < 0.25) {
            notes = LEAK_NOTE
          }
          if (key === 'nebulizer:evening' && random() < 0.4) {
            notes = COUGH_NOTE
          }
          if (key === 'trikafta:evening' && lateTrikaftaEvening) {
            notes = 'Given late, Maya fell asleep early. Woke her with a snack.'
          }
          values.notes = notes
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

    logs.push(...shiftLogs)
    shifts.push({ start, end, caregiverId, logs: shiftLogs })
    nominalEnd = nominalStart
  }

  // Handoffs after all logs exist, so overdue checks can see every day's logs (same rule as a real handoff)
  const handoffs: Handoff[] = shifts.map((shift) => {
    const flagReasons = overdueDuringShift(logs, shift.start, shift.end).map(describeOverdue)
    const overallNotes = ''
    return {
      id: `seed-handoff-${shift.start.getTime()}`,
      caregiverId: shift.caregiverId,
      start: shift.start.toISOString(),
      end: shift.end.toISOString(),
      overallNotes,
      logIds: shift.logs.map((l) => l.id),
      summaryBullets: mockSummary(shift.logs, overallNotes),
      tagId: DOOR_TAG_ID, // seed shifts count as checked in and out at the door
      checkoutTagId: DOOR_TAG_ID,
      flagged: flagReasons.length > 0,
      flagReasons,
    }
  })

  return {
    caregivers: seedCaregivers,
    currentShift: null,
    logs,
    handoffs, // newest first
    // the first full day of seeded history (the oldest shift starts partway through its day)
    lastDoctorVisit: toDateInput(
      new Date(nominalEnd.getFullYear(), nominalEnd.getMonth(), nominalEnd.getDate() + 1),
    ),
  }
}
