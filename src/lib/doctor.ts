// Doctor's note: everything logged since the last doctor's visit, boiled down for a clinician.
// The numbers here are computed locally (always shown, never invented); the AI only writes the
// narrative sections on top of them.

import { DOOR_TAG_ID, devices, getDevice, patient } from '../data/patient'
import type { AppState, Caregiver, DoctorSummary, NoteSection } from '../types'
import { formatDate, formatDateAndTime, fromDateInput, logNotes } from './format'
import { quarterlyDueDate, timeToday } from './sessions'
import type { Trends } from './trends'

export interface AdherenceRow {
  device: string
  session: string
  done: number
  expected: number
}

export interface MeasurementRow {
  device: string
  field: string
  unit: string
  count: number
  avg: number
  min: number
  max: number
}

export interface MissedItem {
  when: string
  device: string
  session: string
  items: string[]
  caregiver: string
}

export interface NoteEntry {
  when: string
  device: string
  caregiver: string
  text: string
}

export interface DoctorReport {
  since: Date
  until: Date
  days: number
  totalLogs: number
  adherence: AdherenceRow[]
  measurements: MeasurementRow[]
  missed: MissedItem[]
  notes: NoteEntry[]
  handoffNotes: NoteEntry[]
  logsByCaregiver: { name: string; count: number }[]
  /** Visits flagged abnormal: overdue reasons and/or the caregiver's handoff note */
  flaggedVisits: { when: string; caregiver: string; reasons: string[]; note: string }[]
  /** Shifts in the period; verified = door tag tapped at check-in and check-out (EVV) */
  shifts: { caregiver: string; start: string; verified: boolean }[]
  gtube: { lastChange: string; due: string; replacedInPeriod: string[] }
}

function caregiverName(caregivers: Caregiver[], id: string): string {
  return caregivers.find((c) => c.id === id)?.name || 'Unknown'
}

export function buildDoctorReport(state: AppState, now: Date = new Date()): DoctorReport {
  const since = fromDateInput(state.lastDoctorVisit)
  const logs = state.logs
    .filter((l) => new Date(l.timestamp) >= since && new Date(l.timestamp) <= now)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))

  // Calendar days in the period (each one we walk through to count expected treatments)
  const dayStarts: Date[] = []
  for (let d = new Date(since); d <= now; d.setDate(d.getDate() + 1)) {
    dayStarts.push(new Date(d))
  }

  const adherence: AdherenceRow[] = []
  const measurements: MeasurementRow[] = []
  for (const device of devices) {
    for (const session of device.sessions) {
      const sessionLogs = logs.filter((l) => l.deviceId === device.id && l.sessionId === session.id)

      if (session.recurrence === 'daily' && session.scheduledTime) {
        // Expected: once per day whose scheduled time has already passed
        const scheduled = session.scheduledTime
        const expected = dayStarts.filter((d) => {
          const t = timeToday(scheduled, d)
          return t >= since && t <= now
        }).length
        // Done: days with at least one log (two logs on one day still count once)
        const doneDays = new Set(sessionLogs.map((l) => new Date(l.timestamp).toDateString()))
        adherence.push({
          device: device.name,
          session: session.label,
          done: Math.min(doneDays.size, expected),
          expected,
        })
      }

      for (const field of session.fields) {
        if (field.type !== 'number') {
          continue
        }
        const nums = sessionLogs
          .map((l) => l.values[field.id])
          .filter((v): v is number => typeof v === 'number')
        if (nums.length === 0) {
          continue
        }
        measurements.push({
          device: `${device.name} · ${session.label}`,
          field: field.label,
          unit: field.unit || '',
          count: nums.length,
          avg: Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10,
          min: Math.min(...nums),
          max: Math.max(...nums),
        })
      }
    }
  }

  const missed: MissedItem[] = []
  const notes: NoteEntry[] = []
  for (const log of logs) {
    const device = getDevice(log.deviceId)
    const session = device?.sessions.find((s) => s.id === log.sessionId)
    if (!device || !session) {
      continue
    }
    const who = caregiverName(state.caregivers, log.caregiverId)
    const items = session.fields
      .filter((f) => f.type === 'check' && log.values[f.id] !== true)
      .map((f) => f.label)
    if (items.length > 0) {
      missed.push({ when: formatDateAndTime(log.timestamp), device: device.name, session: session.label, items, caregiver: who })
    }
    const text = logNotes(log)
    if (text && text.toLowerCase() !== 'no issues.') {
      notes.push({ when: formatDateAndTime(log.timestamp), device: device.name, caregiver: who, text })
    }
  }

  const handoffNotes: NoteEntry[] = state.handoffs
    .filter((h) => new Date(h.end) >= since && h.overallNotes.trim())
    .map((h) => ({
      when: formatDateAndTime(h.end),
      device: 'Shift handoff',
      caregiver: caregiverName(state.caregivers, h.caregiverId),
      text: h.overallNotes.trim(),
    }))

  const counts = new Map<string, number>()
  for (const log of logs) {
    const name = caregiverName(state.caregivers, log.caregiverId)
    counts.set(name, (counts.get(name) || 0) + 1)
  }

  const replacedInPeriod = logs
    .filter((l) => l.sessionId === 'gtube-quarterly' && l.values.replaced === true)
    .map((l) => formatDateAndTime(l.timestamp))

  return {
    since,
    until: now,
    days: dayStarts.length,
    totalLogs: logs.length,
    adherence,
    measurements,
    missed,
    notes,
    handoffNotes,
    logsByCaregiver: [...counts].map(([name, count]) => ({ name, count })),
    flaggedVisits: state.handoffs
      .filter((h) => h.flagged && new Date(h.end) >= since)
      .sort((a, b) => a.start.localeCompare(b.start))
      .map((h) => ({
        when: formatDateAndTime(h.start),
        caregiver: caregiverName(state.caregivers, h.caregiverId),
        reasons: h.flagReasons || [],
        note: h.overallNotes.trim(),
      })),
    shifts: [
      ...state.handoffs
        .filter((h) => new Date(h.end) >= since)
        .map((h) => ({
          caregiver: caregiverName(state.caregivers, h.caregiverId),
          start: h.start,
          verified: h.tagId === DOOR_TAG_ID && h.checkoutTagId === DOOR_TAG_ID,
        })),
      // the shift still in progress hasn't checked out yet, so only its check-in counts
      ...(state.currentShift
        ? [
            {
              caregiver: caregiverName(state.caregivers, state.currentShift.caregiverId),
              start: state.currentShift.start,
              verified: state.currentShift.tagId === DOOR_TAG_ID,
            },
          ]
        : []),
    ],
    gtube: {
      lastChange: formatDate(fromDateInput(patient.lastGtubeButtonChange)),
      due: formatDate(quarterlyDueDate(patient.lastGtubeButtonChange)),
      replacedInPeriod,
    },
  }
}

export function adherenceTotals(report: DoctorReport): { done: number; expected: number; pct: number } {
  const done = report.adherence.reduce((a, r) => a + r.done, 0)
  const expected = report.adherence.reduce((a, r) => a + r.expected, 0)
  let pct = 100
  if (expected > 0) {
    pct = Math.round((done / expected) * 100)
  }
  return { done, expected, pct }
}

function firstSentence(text: string): string {
  const match = text.match(/^.*?[.!?](\s|$)/)
  return (match ? match[0] : text).trim()
}

/** Average of the non-empty values, to one decimal. */
function average(values: (number | null)[]): number | null {
  const nums = values.filter((v): v is number => v !== null)
  return nums.length ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10 : null
}

/**
 * Used when the AI call fails: a short overview and the main trends, worked out from the numbers.
 * Patterns, not a list of every event (the tables below the summary have the details).
 */
export function mockDoctorSummary(report: DoctorReport, trends: Trends): DoctorSummary {
  const totals = adherenceTotals(report)
  const late = trends.adherence.late.reduce((a, b) => a + b, 0)
  const missed = trends.adherence.missed.reduce((a, b) => a + b, 0)

  let overview =
    `Over ${report.days} days, ${totals.pct}% of scheduled treatments were logged ` +
    `(${totals.done} of ${totals.expected})`
  overview += late + missed > 0 ? `, with ${late} given late and ${missed} missed.` : ', all on time.'
  if (report.flaggedVisits.length > 0) {
    overview += ` Caregivers flagged ${report.flaggedVisits.length} visits as abnormal.`
  }

  const items: string[] = []

  // What caregivers reported (hand-flagged visits), in their words, shortened
  const reported = report.flaggedVisits.filter((v) => v.note)
  if (reported.length > 0) {
    items.push(
      `Reported by caregivers: ${reported.map((v) => `${v.when.split(',')[0]}: ${firstSentence(v.note)}`).join(' ')}`,
    )
  }

  // Feeds: nights that fell short of the prescribed volume
  const nights = trends.feed.infused
    .map((ml, i) => ({ ml, prescribed: trends.feed.prescribed[i], day: trends.days[i] }))
    .filter((n): n is { ml: number; prescribed: number; day: string } => n.ml !== null && n.prescribed !== null)
  const short = nights.filter((n) => n.ml < n.prescribed)
  if (short.length > 0) {
    const lowest = short.reduce((a, b) => (b.ml < a.ml ? b : a))
    items.push(
      `Overnight feeds fell short of the prescribed ${lowest.prescribed} mL on ${short.length} of ${nights.length} nights ` +
        `(lowest ${lowest.ml} mL on ${lowest.day}).`,
    )
  } else if (nights.length > 0) {
    items.push(`Overnight feeds met the prescribed volume every night.`)
  }

  // Respiratory: how often coughing came up in caregiver notes
  const allNotes = [...report.notes, ...report.handoffNotes]
  const coughDays = new Set(allNotes.filter((n) => /cough|mucus/i.test(n.text)).map((n) => n.when.split(',')[0]))
  if (coughDays.size > 0) {
    items.push(`Coughing after airway treatments was noted on ${coughDays.size} of ${report.days} days.`)
  }

  // Trikafta timing
  const lateDoses = (['morning', 'evening'] as const).flatMap((session) =>
    trends.doseTiming[session]
      .map((min, i) => ({ min, day: trends.days[i], session }))
      .filter((d): d is { min: number; day: string; session: 'morning' | 'evening' } => d.min !== null && d.min >= 30),
  )
  if (lateDoses.length > 0) {
    items.push(
      `Trikafta was on schedule except ${lateDoses.length} late ${lateDoses.length === 1 ? 'dose' : 'doses'} ` +
        `(${lateDoses.map((d) => `${d.session} on ${d.day}, ${d.min} min late`).join('; ')}).`,
    )
  }

  // Vest
  const vest = average([...trends.vest.morning, ...trends.vest.evening])
  const vestMissed = report.adherence.filter((r) => r.device === 'Vest').reduce((a, r) => a + (r.expected - r.done), 0)
  if (vest !== null) {
    items.push(
      `Vest sessions averaged ${vest} min` + (vestMissed > 0 ? `, with ${vestMissed} session${vestMissed === 1 ? '' : 's'} missed.` : '.'),
    )
  }

  return { overview, trends: items.slice(0, 5) }
}

/**
 * The full detail under the summary, computed straight from the logs (never AI-written), so it's always
 * complete and exact.
 */
export function detailSections(report: DoctorReport): NoteSection[] {
  const adherence = report.adherence
    .filter((r) => r.done < r.expected)
    .map((r) => `${r.device} ${r.session.toLowerCase()}: ${r.done} of ${r.expected} logged.`)
  if (adherence.length === 0) {
    adherence.push('Every scheduled treatment in this period was logged.')
  }

  const flagged = report.flaggedVisits.map((v) => {
    const why = [...v.reasons, ...(v.note ? [`"${v.note}"`] : [])].join(' ')
    return `${v.when}, ${v.caregiver}: ${why || 'flagged as abnormal.'}`
  })

  // handoff notes on flagged visits are already listed above
  const flaggedNotes = report.flaggedVisits.map((v) => v.note)
  const observations = [...report.notes, ...report.handoffNotes.filter((n) => !flaggedNotes.includes(n.text))].map(
    (n) => `${n.when}, ${n.device} (${n.caregiver}): "${n.text}"`,
  )
  for (const m of report.missed) {
    observations.push(`${m.when}, ${m.device}: NOT done — ${m.items.join(', ')}.`)
  }
  if (observations.length === 0) {
    observations.push('No symptoms, issues, or skipped steps were noted.')
  }

  const equipment = [
    ...report.measurements.map((m) => `${m.device} — ${m.field}: avg ${m.avg} ${m.unit} (range ${m.min}–${m.max}).`),
    `G-tube button last changed ${report.gtube.lastChange}; next change due ${report.gtube.due}.`,
  ]

  return [
    { title: 'Treatment adherence', bullets: adherence },
    ...(flagged.length > 0 ? [{ title: 'Flagged visits', bullets: flagged }] : []),
    { title: 'Symptoms & observations', bullets: observations },
    { title: 'Measurements & equipment', bullets: equipment },
  ]
}

/** Compact, already-computed facts sent to the AI (no raw ids), including the day-by-day series. */
export function reportForAi(report: DoctorReport, trends: Trends) {
  return {
    patient: `${patient.name}, ${patient.age}. ${patient.summary}`,
    period: `${formatDate(report.since)} – ${formatDate(report.until)} (${report.days} days)`,
    totalLogs: report.totalLogs,
    adherence: report.adherence,
    measurements: report.measurements,
    daily: trends.days.map((day, i) => ({
      day,
      treatmentsOnTime: trends.adherence.onTime[i],
      treatmentsLate: trends.adherence.late[i],
      treatmentsMissed: trends.adherence.missed[i],
      feedInfusedMl: trends.feed.infused[i],
      feedPrescribedMl: trends.feed.prescribed[i],
      vestMorningMin: trends.vest.morning[i],
      vestEveningMin: trends.vest.evening[i],
      trikaftaMorningMinAfterScheduled: trends.doseTiming.morning[i],
      trikaftaEveningMinAfterScheduled: trends.doseTiming.evening[i],
    })),
    flaggedVisits: report.flaggedVisits,
    caregiverNotes: [...report.notes, ...report.handoffNotes],
    gtube: report.gtube,
  }
}

/** Plain-text version for copying into a portal or email. */
export function noteAsText(report: DoctorReport, summary: DoctorSummary): string {
  const lines = [
    `Care report for ${patient.name} — ${formatDate(report.since)} to ${formatDate(report.until)}`,
    '',
    summary.overview,
    '',
    'KEY TRENDS',
    ...summary.trends.map((t) => `- ${t}`),
    '',
  ]
  for (const section of detailSections(report)) {
    lines.push(section.title.toUpperCase(), ...section.bullets.map((b) => `- ${b}`), '')
  }
  lines.push('TREATMENT LOG')
  for (const r of report.adherence) {
    lines.push(`- ${r.device} ${r.session}: ${r.done}/${r.expected}`)
  }
  return lines.join('\n')
}
