// Doctor's note: everything logged since the last doctor's visit, boiled down for a clinician.
// The numbers here are computed locally (always shown, never invented); the AI only writes the
// narrative sections on top of them.

import { devices, getDevice, patient } from '../data/patient'
import type { AppState, Caregiver, NoteSection } from '../types'
import { formatDate, formatDateTime, fromDateInput, logNotes } from './format'
import { quarterlyDueDate, timeToday } from './sessions'

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
      missed.push({ when: formatDateTime(log.timestamp), device: device.name, session: session.label, items, caregiver: who })
    }
    const text = logNotes(log)
    if (text && text.toLowerCase() !== 'no issues.') {
      notes.push({ when: formatDateTime(log.timestamp), device: device.name, caregiver: who, text })
    }
  }

  const handoffNotes: NoteEntry[] = state.handoffs
    .filter((h) => new Date(h.end) >= since && h.overallNotes.trim())
    .map((h) => ({
      when: formatDateTime(h.end),
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
    .map((l) => formatDateTime(l.timestamp))

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
    gtube: {
      lastChange: formatDate(new Date(patient.lastGtubeButtonChange)),
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

/** Used when the AI call fails: same sections, written from the numbers directly. */
export function mockDoctorNote(report: DoctorReport): NoteSection[] {
  const totals = adherenceTotals(report)
  const period = `${formatDate(report.since)} – ${formatDate(report.until)}`

  const summary = [
    `${patient.name}, ${patient.age}. ${patient.summary}`,
    `Covers ${report.days} days (${period}): ${report.totalLogs} care entries logged by ${report.logsByCaregiver.length} caregiver(s).`,
    `${totals.done} of ${totals.expected} scheduled treatments logged (${totals.pct}%).`,
  ]

  const adherence = report.adherence
    .filter((r) => r.done < r.expected)
    .map((r) => `${r.device} ${r.session.toLowerCase()}: ${r.done} of ${r.expected} logged.`)
  if (adherence.length === 0) {
    adherence.push('Every scheduled treatment in this period was logged.')
  }

  const observations = [...report.notes, ...report.handoffNotes].map(
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
    { title: 'Summary', bullets: summary },
    { title: 'Treatment adherence', bullets: adherence },
    { title: 'Symptoms & observations', bullets: observations },
    { title: 'Measurements & equipment', bullets: equipment },
  ]
}

/** Compact, already-computed facts sent to the AI (no raw ids). */
export function reportForAi(report: DoctorReport) {
  return {
    patient: `${patient.name}, ${patient.age}. ${patient.summary}`,
    period: `${formatDate(report.since)} – ${formatDate(report.until)} (${report.days} days)`,
    totalLogs: report.totalLogs,
    adherence: report.adherence,
    measurements: report.measurements,
    skippedSteps: report.missed,
    caregiverNotes: [...report.notes, ...report.handoffNotes],
    gtube: report.gtube,
  }
}

/** Plain-text version for copying into a portal or email. */
export function noteAsText(report: DoctorReport, sections: NoteSection[]): string {
  const lines = [
    `Care report for ${patient.name} — ${formatDate(report.since)} to ${formatDate(report.until)}`,
    '',
  ]
  for (const s of sections) {
    lines.push(s.title.toUpperCase(), ...s.bullets.map((b) => `- ${b}`), '')
  }
  lines.push('TREATMENT LOG')
  for (const r of report.adherence) {
    lines.push(`- ${r.device} ${r.session}: ${r.done}/${r.expected}`)
  }
  return lines.join('\n')
}
