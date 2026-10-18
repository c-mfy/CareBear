// "Last 12 hours" summary at the top of the home page: everything any caregiver logged in the window,
// handoffs that ended in it, what went overdue, and what's due next. The AI condenses it; mockRecentSummary
// is the instant local version (shown first, and kept if the AI is unavailable).

import { getDevice } from '../data/patient'
import type { AppState, Handoff, LogEntry } from '../types'
import { describeLog, formatScheduled, formatTime, logNotes } from './format'
import { buildTodayTasks, describeOverdue, sessionOccurrences } from './tasks'

export const RECENT_HOURS = 12

export interface RecentContext {
  since: Date
  logs: LogEntry[]
  handoffs: Handoff[]
  /** e.g. "Vest · Evening session: not done (due 6:45 PM)" */
  overdue: string[]
  /** e.g. "Trikafta · Evening dose at 7:30 PM" */
  upcoming: string[]
  /** Caregivers who logged or handed off in the window, in order of first activity */
  caregiverIds: string[]
}

export function buildRecentContext(state: AppState, now: Date = new Date()): RecentContext {
  const since = new Date(now.getTime() - RECENT_HOURS * 3600 * 1000)
  const logs = state.logs
    .filter((l) => new Date(l.timestamp) >= since && new Date(l.timestamp) <= now)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  const handoffs = state.handoffs
    .filter((h) => new Date(h.end) >= since)
    .sort((a, b) => a.end.localeCompare(b.end))
  const overdue = sessionOccurrences(state.logs, since, now)
    .filter((o) => o.status !== 'on-time')
    .map((o) => describeOverdue({ title: o.title, label: o.label, scheduled: o.scheduled, minutesLate: o.offsetMinutes }))
  const upcoming = buildTodayTasks(state.logs, now)
    .filter((t) => !t.done && t.overdueMinutes === 0 && t.time)
    .map((t) => `${t.title} · ${t.label} at ${formatScheduled(t.time)}`)

  const caregiverIds: string[] = []
  for (const id of [...handoffs.map((h) => h.caregiverId), ...logs.map((l) => l.caregiverId)]) {
    if (!caregiverIds.includes(id)) {
      caregiverIds.push(id)
    }
  }
  if (state.currentShift && !caregiverIds.includes(state.currentShift.caregiverId)) {
    caregiverIds.push(state.currentShift.caregiverId)
  }
  return { since, logs, handoffs, overdue, upcoming, caregiverIds }
}

/** Changes only when the underlying data does, so the AI isn't re-asked every minute. */
export function recentKey(ctx: RecentContext): string {
  return JSON.stringify([
    ctx.logs.map((l) => l.id),
    ctx.handoffs.map((h) => [h.id, h.flagged]),
    ctx.overdue,
    ctx.upcoming,
  ])
}

function nameOf(state: AppState, id: string): string {
  return state.caregivers.find((c) => c.id === id)?.name || 'Unknown'
}

/** Compact data for the AI prompt (names, not ids). */
export function recentForAi(state: AppState, ctx: RecentContext) {
  return {
    hours: RECENT_HOURS,
    entries: ctx.logs.map((log) => {
      const device = getDevice(log.deviceId)
      return {
        caregiver: nameOf(state, log.caregiverId),
        device: device?.name,
        session: device?.sessions.find((s) => s.id === log.sessionId)?.label,
        time: formatTime(log.timestamp),
        done: describeLog(log),
        notes: logNotes(log),
      }
    }),
    handoffs: ctx.handoffs.map((h) => ({
      caregiver: nameOf(state, h.caregiverId),
      shift: `${formatTime(h.start)} - ${formatTime(h.end)}`,
      notes: h.overallNotes,
      flaggedAbnormal: !!h.flagged,
    })),
    overdue: ctx.overdue,
    upcoming: ctx.upcoming,
  }
}

/** One entry, compact: "Vest 30 min", "Feeding pump 900 mL", "Trikafta NOT done: Dose given". */
function shortLog(log: LogEntry): string {
  const device = getDevice(log.deviceId)
  const session = device?.sessions.find((s) => s.id === log.sessionId)
  if (!device || !session) {
    return 'Unknown entry'
  }
  const numbers: string[] = []
  const missed: string[] = []
  for (const field of session.fields) {
    const value = log.values[field.id]
    if (field.type === 'number' && typeof value === 'number') {
      numbers.push(`${value}${field.unit ? ` ${field.unit}` : ''}`)
    } else if (field.type === 'check' && value !== true) {
      missed.push(field.label)
    }
  }
  let text = device.name
  if (numbers.length > 0) {
    text += ` ${numbers.join(', ')}`
  }
  if (missed.length > 0) {
    text += ` (NOT done: ${missed.join(', ')})`
  }
  return text
}

/**
 * Local summary, used until (or instead of) the AI one: what needs attention, one line per visit saying
 * what was done, caregiver notes, and what's due next.
 */
export function mockRecentSummary(state: AppState, ctx: RecentContext): string[] {
  const bullets: string[] = []
  if (ctx.overdue.length > 0) {
    bullets.push(`Needs attention: ${ctx.overdue.join('; ')}.`)
  }
  for (const h of ctx.handoffs) {
    if (h.flagged && !h.flagReasons?.length) {
      bullets.push(`${nameOf(state, h.caregiverId)} flagged their visit as abnormal.`)
    }
    if (h.overallNotes.trim()) {
      bullets.push(`${nameOf(state, h.caregiverId)}'s handoff note: "${h.overallNotes.trim()}"`)
    }
  }

  // One line per visit: finished visits in the window, then whoever is on shift now
  const visits = ctx.handoffs.map((h) => ({
    who: nameOf(state, h.caregiverId),
    when: `${formatTime(h.start)} – ${formatTime(h.end)}`,
    logs: ctx.logs.filter((l) => h.logIds.includes(l.id)),
  }))
  if (state.currentShift) {
    const shift = state.currentShift
    visits.push({
      who: nameOf(state, shift.caregiverId),
      when: `since ${formatTime(shift.start)} (on shift)`,
      logs: ctx.logs.filter((l) => l.caregiverId === shift.caregiverId && l.timestamp >= shift.start),
    })
  }
  for (const v of visits) {
    const done = v.logs.length > 0 ? v.logs.map(shortLog).join(' · ') : 'nothing logged'
    bullets.push(`${v.who}, ${v.when}: ${done}.`)
  }
  if (visits.length === 0) {
    bullets.push(`Nothing logged in the last ${RECENT_HOURS} hours.`)
  }

  const noted = ctx.logs.filter((l) => logNotes(l) && logNotes(l).toLowerCase() !== 'no issues.').slice(-3)
  for (const log of noted) {
    bullets.push(`${getDevice(log.deviceId)?.name}, ${formatTime(log.timestamp)} (${nameOf(state, log.caregiverId)}): "${logNotes(log)}"`)
  }
  if (ctx.upcoming.length > 0) {
    bullets.push(`Next up: ${ctx.upcoming.join(', ')}.`)
  }
  return bullets
}
