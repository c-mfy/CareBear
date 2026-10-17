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

/** Local summary: what needs attention first, then notes, who did what, and what's next. At most 5 bullets. */
export function mockRecentSummary(state: AppState, ctx: RecentContext): string[] {
  const bullets: string[] = []
  if (ctx.overdue.length > 0) {
    bullets.push(`Needs attention: ${ctx.overdue.slice(0, 2).join('; ')}${ctx.overdue.length > 2 ? '; and more' : ''}.`)
  }
  for (const h of ctx.handoffs) {
    if (h.flagged && !h.flagReasons?.length) {
      bullets.push(`${nameOf(state, h.caregiverId)} flagged their shift as abnormal.`)
    }
    if (h.overallNotes.trim()) {
      bullets.push(`${nameOf(state, h.caregiverId)}'s handoff note: "${h.overallNotes.trim()}"`)
    }
  }
  const noted = ctx.logs.filter((l) => logNotes(l) && logNotes(l).toLowerCase() !== 'no issues.').slice(-2)
  for (const log of noted) {
    bullets.push(`${getDevice(log.deviceId)?.name}, ${formatTime(log.timestamp)} (${nameOf(state, log.caregiverId)}): "${logNotes(log)}"`)
  }
  const shifts = ctx.handoffs.map(
    (h) => `${nameOf(state, h.caregiverId)} ${formatTime(h.start)} – ${formatTime(h.end)}`,
  )
  if (state.currentShift) {
    shifts.push(`${nameOf(state, state.currentShift.caregiverId)} since ${formatTime(state.currentShift.start)} (on shift)`)
  }
  if (shifts.length > 0) {
    bullets.push(`Shifts: ${shifts.join('; ')}.`)
  }
  if (ctx.logs.length > 0) {
    const counts = ctx.caregiverIds
      .map((id) => [nameOf(state, id), ctx.logs.filter((l) => l.caregiverId === id).length] as const)
      .filter(([, n]) => n > 0)
      .map(([name, n]) => `${name} ${n}`)
    bullets.push(`${ctx.logs.length} care entries logged (${counts.join(', ')}).`)
  } else {
    bullets.push(`Nothing logged in the last ${RECENT_HOURS} hours.`)
  }
  if (ctx.upcoming.length > 0) {
    bullets.push(`Next up: ${ctx.upcoming.slice(0, 2).join(', ')}.`)
  }
  return bullets.slice(0, 5)
}
