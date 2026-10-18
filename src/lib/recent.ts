// "Last 12 hours" summary at the top of the home page: everything any caregiver logged in the window,
// handoffs that ended in it, what went overdue, and what's due next. It's shown as a few rows (icon, bold
// title, small detail). The AI writes the rows; mockRecentSummary is the instant local version (shown
// first, and kept if the AI is unavailable).

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
  /** The next task still due today, for the "Next up" row */
  next: { title: string; label: string; time: string } | null
  /** Caregivers who logged or handed off in the window, in order of first activity */
  caregiverIds: string[]
}

/** What a summary row is about; picks its icon and color. */
export type SummaryKind = 'done' | 'missed' | 'handoff' | 'note' | 'next' | 'quiet'

export const SUMMARY_KINDS: SummaryKind[] = ['done', 'missed', 'handoff', 'note', 'next', 'quiet']

/** One row of the summary card, e.g. { kind: 'next', title: 'Next up: Nebulizer', detail: 'Evening session at 6:15 PM' } */
export interface SummaryRow {
  kind: SummaryKind
  title: string
  detail: string
}

/** Most rows the card shows */
export const MAX_SUMMARY_ROWS = 5

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
  const upcomingTasks = buildTodayTasks(state.logs, now).filter((t) => !t.done && t.overdueMinutes === 0 && t.time)
  const upcoming = upcomingTasks.map((t) => `${t.title} · ${t.label} at ${formatScheduled(t.time)}`)
  let next: RecentContext['next'] = null
  if (upcomingTasks.length > 0) {
    const t = upcomingTasks[0]
    next = { title: t.title, label: t.label, time: formatScheduled(t.time) }
  }

  const caregiverIds: string[] = []
  for (const id of [...handoffs.map((h) => h.caregiverId), ...logs.map((l) => l.caregiverId)]) {
    if (!caregiverIds.includes(id)) {
      caregiverIds.push(id)
    }
  }
  if (state.currentShift && !caregiverIds.includes(state.currentShift.caregiverId)) {
    caregiverIds.push(state.currentShift.caregiverId)
  }
  return { since, logs, handoffs, overdue, upcoming, next, caregiverIds }
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

/** Device names in first-seen order, without repeats: "Vest, Nebulizer, Trikafta" */
function deviceList(names: (string | undefined)[]): string {
  const unique: string[] = []
  for (const name of names) {
    if (name && !unique.includes(name)) {
      unique.push(name)
    }
  }
  return unique.join(', ')
}

function plural(count: number, one: string, many: string): string {
  if (count === 1) {
    return `${count} ${one}`
  }
  return `${count} ${many}`
}

/** Shorten a caregiver note so it fits a row title. */
function shortNote(text: string): string {
  const clean = text.trim().replace(/\.$/, '')
  if (clean.length <= 48) {
    return clean
  }
  return `${clean.slice(0, 45).trim()}…`
}

/**
 * Local summary rows, used until (or instead of) the AI ones. Order: what needs attention, what got done,
 * handoffs, caregiver notes, then what's due next.
 */
export function mockRecentSummary(state: AppState, ctx: RecentContext): SummaryRow[] {
  const rows: SummaryRow[] = []

  if (ctx.overdue.length > 0) {
    // overdue lines start with the device name: "Vest · Evening session: not done (due 6:45 PM)"
    rows.push({
      kind: 'missed',
      title: `${plural(ctx.overdue.length, 'treatment', 'treatments')} missed or late`,
      detail: deviceList(ctx.overdue.map((line) => line.split(' · ')[0])),
    })
  }
  for (const h of ctx.handoffs) {
    if (h.flagged) {
      let detail = 'Marked as abnormal'
      if (h.overallNotes.trim()) {
        detail = shortNote(h.overallNotes)
      }
      rows.push({ kind: 'missed', title: `${nameOf(state, h.caregiverId)} flagged their visit`, detail })
    }
  }

  if (ctx.logs.length > 0) {
    let title = `${plural(ctx.logs.length, 'treatment', 'treatments')} logged`
    if (ctx.overdue.length === 0) {
      title = `All ${plural(ctx.logs.length, 'treatment', 'treatments')} on time`
    }
    rows.push({ kind: 'done', title, detail: deviceList(ctx.logs.map((l) => getDevice(l.deviceId)?.name)) })
  }

  for (const h of ctx.handoffs) {
    let flags = 'no flags'
    if (h.flagged) {
      flags = 'flagged'
    }
    rows.push({ kind: 'handoff', title: `${nameOf(state, h.caregiverId)} handed off`, detail: `${formatTime(h.end)} · ${flags}` })
  }

  if (ctx.logs.length === 0 && ctx.handoffs.length === 0) {
    rows.push({ kind: 'quiet', title: 'No logs or handoffs', detail: `Nothing recorded in the last ${RECENT_HOURS} hours` })
  }

  const noted = ctx.logs.filter((l) => logNotes(l) && logNotes(l).toLowerCase() !== 'no issues.').slice(-2)
  for (const log of noted) {
    rows.push({
      kind: 'note',
      title: shortNote(logNotes(log)),
      detail: `Noted by ${nameOf(state, log.caregiverId)} · ${formatTime(log.timestamp)}`,
    })
  }

  // Keep room for "Next up" at the end
  const limit = MAX_SUMMARY_ROWS - 1
  const trimmed = rows.slice(0, limit)
  if (ctx.next) {
    trimmed.push({ kind: 'next', title: `Next up: ${ctx.next.title}`, detail: `${ctx.next.label} at ${ctx.next.time}` })
  }
  return trimmed
}