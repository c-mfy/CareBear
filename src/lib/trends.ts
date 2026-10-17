// Per-day series for the doctor's-note charts, over the same period as the report.

import type { AppState, LogEntry } from '../types'
import { fromDateInput } from './format'
import { isSameDay } from './sessions'
import { sessionOccurrences } from './tasks'

export interface Trends {
  /** One label per calendar day in the period, e.g. "Oct 14" */
  days: string[]
  adherence: { onTime: number[]; late: number[]; missed: number[] }
  /** Trikafta: minutes from scheduled to given (negative = early), null = no dose logged that day */
  doseTiming: { morning: (number | null)[]; evening: (number | null)[] }
  /** Overnight feed, by the morning it ended: what went in vs. what was prescribed (loaded the night before) */
  feed: { infused: (number | null)[]; prescribed: (number | null)[] }
  vest: { morning: (number | null)[]; evening: (number | null)[] }
}

function dayStarts(since: Date, until: Date): Date[] {
  const days: Date[] = []
  for (const d = new Date(since); d <= until; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d))
  }
  return days
}

function numberOn(logs: LogEntry[], day: Date, deviceId: string, sessionId: string, field: string): number | null {
  const log = logs.find(
    (l) => l.deviceId === deviceId && l.sessionId === sessionId && isSameDay(new Date(l.timestamp), day),
  )
  const value = log?.values[field]
  return typeof value === 'number' ? value : null
}

export function buildTrends(state: AppState, now: Date = new Date()): Trends {
  const since = fromDateInput(state.lastDoctorVisit)
  const days = dayStarts(since, now)
  const occurrences = sessionOccurrences(state.logs, since, now)

  const adherence = { onTime: [] as number[], late: [] as number[], missed: [] as number[] }
  const doseTiming = { morning: [] as (number | null)[], evening: [] as (number | null)[] }
  for (const day of days) {
    const today = occurrences.filter((o) => isSameDay(o.scheduled, day))
    adherence.onTime.push(today.filter((o) => o.status === 'on-time').length)
    adherence.late.push(today.filter((o) => o.status === 'late').length)
    adherence.missed.push(today.filter((o) => o.status === 'missed').length)
    for (const session of ['morning', 'evening'] as const) {
      const dose = today.find((o) => o.deviceId === 'trikafta' && o.sessionId === session)
      doseTiming[session].push(dose?.offsetMinutes ?? null)
    }
  }

  return {
    days: days.map((d) => d.toLocaleDateString([], { month: 'short', day: 'numeric' })),
    adherence,
    doseTiming,
    feed: {
      infused: days.map((d) => numberOn(state.logs, d, 'feeding-pump', 'morning-stop', 'infused')),
      prescribed: days.map((d) => {
        // the feed that ended this morning was loaded the evening before
        const prev = new Date(d)
        prev.setDate(prev.getDate() - 1)
        return numberOn(state.logs, prev, 'feeding-pump', 'bedtime-start', 'loaded')
      }),
    },
    vest: {
      morning: days.map((d) => numberOn(state.logs, d, 'vest', 'morning', 'minutes')),
      evening: days.map((d) => numberOn(state.logs, d, 'vest', 'evening', 'minutes')),
    },
  }
}
