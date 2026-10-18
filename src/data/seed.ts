// HARDCODED: demo seed data — caregivers, past logs, past handoffs.
// Generated relative to "now" so the calendar and history always look recent.

import { mockSummary } from '../lib/ai-client'
import { toDateInput } from '../lib/format'
import { timeToday } from '../lib/sessions'
import { describeOverdue, overdueDuringShift } from '../lib/tasks'
import type { AppState, Caregiver, FieldValue, Handoff, LogEntry } from '../types'
import { DOOR_TAG_ID, devices } from './patient'

export const seedCaregivers: Caregiver[] = [
  { id: 'mom', name: 'Mom', color: '#f392b9', role: 'family' },
  { id: 'nurse-alex', name: 'Nurse Alex', color: '#6fbec1', role: 'staff' },
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

/** Bump whenever the demo data changes: browsers holding an older version reload the new demo data. */
export const SEED_VERSION = 3

// Shifts a caregiver flagged by hand because something was actually wrong (not just overdue).
// Both land on the same "sick day": vomiting overnight, then a worse cough and low fever that evening.
const COUGH_WORSE = {
  nebulizerNote: 'Coughed hard for about 30 min after saline, much longer than usual. Thick yellow-green mucus.',
  handoffNote:
    'Cough noticeably worse today and mucus is darker. Temp 100.4°F at 6:30 PM. Called the CF clinic: watch ' +
    'overnight, call back if she goes over 101°F or breathing gets harder.',
}
const FEED_INTOLERANCE = {
  pumpNote: 'Pump alarmed twice. Maya vomited around 4 AM, so I stopped the feed early.',
  handoffNote:
    'Pump alarmed twice overnight and Maya vomited once around 4 AM, so I stopped the feed early. ' +
    "Belly looked bloated. Please watch how she tolerates tonight's feed.",
}
const LATE_DOSE_NOTE = 'Evening dose was missed earlier. Gave it at bedtime with a snack.'

const DAYS_BACK = 4 // today plus the 4 days before it

/**
 * Caregivers come in for a care block, not a 12-hour shift. Every daily session falls inside one block,
 * and nobody is checked in overnight while the feed runs.
 */
const BLOCKS = [
  { id: 'morning', start: '06:20', end: '08:20' }, // stop feed, nebulizer, vest, Trikafta
  { id: 'evening', start: '18:05', end: '19:45' }, // nebulizer, vest, Trikafta
  { id: 'bedtime', start: '20:50', end: '21:20' }, // start the overnight feed
] as const

type BlockId = (typeof BLOCKS)[number]['id']

/** Mornings: Mom. Evenings: Nurse Alex on weekdays, Dad on weekends. Bedtime: Dad on weekdays, Mom on weekends. */
function caregiverFor(block: BlockId, day: Date): string {
  const weekend = day.getDay() === 0 || day.getDay() === 6
  if (block === 'morning') {
    return 'mom'
  }
  if (block === 'evening') {
    return weekend ? 'dad' : 'nurse-alex'
  }
  return weekend ? 'mom' : 'dad'
}

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

export function makeSeed(now: Date = new Date()): AppState {
  const random = seededRandom(20261017)
  const MIN = 60000
  const logs: LogEntry[] = []
  const handoffs: Handoff[] = []
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const firstDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() - DAYS_BACK)

  for (let k = DAYS_BACK; k >= 0; k--) {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - k)
    // Scripted events, by days back (0 = today), so they always land in past days
    const missVestEvening = k === 1
    const lateTrikafta = k === 2 // evening caregiver misses it, bedtime caregiver gives it late
    const sickDay = k === 3 // vomiting overnight (morning flag), worse cough + fever (evening flag)
    const pumpAlarm = k === 1 || sickDay

    for (const block of BLOCKS) {
      const caregiverId = caregiverFor(block.id, day)
      // Real arrival and departure times wander a little; on the sick day the evening caregiver stays late
      const start = new Date(timeToday(block.start, day).getTime() + (-10 + Math.floor(random() * 16)) * MIN)
      let endMs = timeToday(block.end, day).getTime() + (-5 + Math.floor(random() * 21)) * MIN
      if (sickDay && block.id === 'evening') {
        endMs += 35 * MIN
      }
      const end = new Date(endMs)
      if (end >= now) {
        continue // not finished yet: today's later blocks are left for the live demo
      }

      const shiftLogs: LogEntry[] = []
      function addLog(deviceId: string, sessionId: string, at: Date, values: Record<string, FieldValue>) {
        // inside this block: not before check-in, not after check-out
        const t = new Date(Math.min(Math.max(at.getTime(), start.getTime() + 2 * MIN), end.getTime() - MIN))
        shiftLogs.push({
          id: `seed-${deviceId}-${sessionId}-${t.getTime()}`,
          deviceId,
          sessionId,
          caregiverId,
          timestamp: t.toISOString(),
          values,
        })
      }

      for (const device of devices) {
        for (const session of device.sessions) {
          if (session.recurrence !== 'daily' || !session.scheduledTime) {
            continue
          }
          if (session.scheduledTime < block.start || session.scheduledTime > block.end) {
            continue // another block's session
          }
          const key = `${device.id}:${session.id}`
          if (key === 'vest:evening' && missVestEvening && block.id === 'evening') {
            continue
          }
          if (key === 'trikafta:evening' && lateTrikafta) {
            continue // given at bedtime instead (below)
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
              notes = sickDay ? FEED_INTOLERANCE.pumpNote : PUMP_ALARM_NOTE
            }
          }
          if (key === 'feeding-pump:bedtime-start' && random() < 0.25) {
            notes = LEAK_NOTE
          }
          if (key === 'nebulizer:evening' && random() < 0.4) {
            notes = COUGH_NOTE
          }
          if (key === 'nebulizer:evening' && sickDay) {
            notes = COUGH_WORSE.nebulizerNote
          }
          values.notes = notes
          const logged = timeToday(session.scheduledTime, day).getTime() + (1 + Math.floor(random() * 16)) * MIN
          addLog(device.id, session.id, new Date(logged), values)
        }
      }

      if (lateTrikafta && block.id === 'bedtime') {
        addLog('trikafta', 'evening', new Date(start.getTime() + 4 * MIN), {
          given: true,
          withFat: true,
          notes: LATE_DOSE_NOTE,
        })
      }

      let overallNotes = ''
      if (sickDay && block.id === 'morning') {
        overallNotes = FEED_INTOLERANCE.handoffNote
      } else if (sickDay && block.id === 'evening') {
        overallNotes = COUGH_WORSE.handoffNote
      }

      logs.push(...shiftLogs)
      handoffs.push({
        id: `seed-handoff-${start.getTime()}`,
        caregiverId,
        start: start.toISOString(),
        end: end.toISOString(),
        overallNotes,
        logIds: shiftLogs.map((l) => l.id),
        summaryBullets: mockSummary(shiftLogs, overallNotes),
        tagId: DOOR_TAG_ID, // seed shifts count as checked in and out at the door
        checkoutTagId: DOOR_TAG_ID,
        flagged: overallNotes !== '', // overdue flags are added below, once every log exists
        flagReasons: [],
      })
    }
  }

  // Overdue flags, same rule as a real handoff (needs every day's logs, e.g. the dose given at bedtime)
  for (const h of handoffs) {
    h.flagReasons = overdueDuringShift(logs, new Date(h.start), new Date(h.end)).map(describeOverdue)
    h.flagged = h.flagged || h.flagReasons.length > 0
  }

  return {
    seedVersion: SEED_VERSION,
    caregivers: seedCaregivers,
    currentShift: null,
    logs,
    handoffs: handoffs.reverse(), // newest first
    lastDoctorVisit: toDateInput(firstDay),
  }
}
