// Timesheet / EVV record: one row per shift, grouped by week.
// Rows come from handoffs (finished shifts) plus the shift in progress.

import { DOOR_TAG_ID, patient } from '../data/patient'
import type { AppState, Caregiver } from '../types'
import { formatDate, formatTime, toDateInput } from './format'

/** An open shift longer than this was almost certainly never checked out */
export const MISSED_CHECKOUT_HOURS = 16

export interface TimesheetRow {
  caregiverId: string
  caregiver: string
  role: 'staff' | 'family'
  start: Date
  /** null = still on shift */
  end: Date | null
  /** Rounded to the quarter hour (how agencies bill); counts up to now for the open shift */
  hours: number
  checkInVerified: boolean
  checkOutVerified: boolean
  flagged: boolean
  missedCheckout: boolean
}

export interface TimesheetTotal {
  caregiverId: string
  caregiver: string
  role: 'staff' | 'family'
  hours: number
  shifts: number
  /** Shifts verified at the door tag at both ends (the open shift: check-in only) */
  verified: number
}

export interface Timesheet {
  weekStart: Date
  weekEnd: Date // exclusive: the next Monday
  rows: TimesheetRow[]
  totals: TimesheetTotal[]
}

/** Monday 00:00 of the week containing `d` (payroll weeks run Monday to Sunday). */
export function startOfWeek(d: Date): Date {
  const start = new Date(d)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  return start
}

export function addWeeks(d: Date, weeks: number): Date {
  const out = new Date(d)
  out.setDate(out.getDate() + weeks * 7)
  return out
}

function quarterHours(ms: number): number {
  return Math.round((ms / 3600000) * 4) / 4
}

function roleOf(c: Caregiver | undefined): 'staff' | 'family' {
  return c?.role || 'family'
}

/** Shifts are counted in the week they started. staffOnly = paid caregivers only. */
export function buildTimesheet(state: AppState, weekStart: Date, staffOnly: boolean, now: Date = new Date()): Timesheet {
  const weekEnd = addWeeks(weekStart, 1)
  const find = (id: string) => state.caregivers.find((c) => c.id === id)

  const rows: TimesheetRow[] = state.handoffs.map((h) => {
    const c = find(h.caregiverId)
    const start = new Date(h.start)
    const end = new Date(h.end)
    return {
      caregiverId: h.caregiverId,
      caregiver: c?.name || 'Unknown',
      role: roleOf(c),
      start,
      end,
      hours: quarterHours(end.getTime() - start.getTime()),
      checkInVerified: h.tagId === DOOR_TAG_ID,
      checkOutVerified: h.checkoutTagId === DOOR_TAG_ID,
      flagged: !!h.flagged,
      missedCheckout: false,
    }
  })
  if (state.currentShift) {
    const c = find(state.currentShift.caregiverId)
    const start = new Date(state.currentShift.start)
    const ms = now.getTime() - start.getTime()
    rows.push({
      caregiverId: state.currentShift.caregiverId,
      caregiver: c?.name || 'Unknown',
      role: roleOf(c),
      start,
      end: null,
      hours: quarterHours(ms),
      checkInVerified: state.currentShift.tagId === DOOR_TAG_ID,
      checkOutVerified: false,
      flagged: false,
      missedCheckout: ms > MISSED_CHECKOUT_HOURS * 3600000,
    })
  }

  const inWeek = rows
    .filter((r) => r.start >= weekStart && r.start < weekEnd)
    .filter((r) => !staffOnly || r.role === 'staff')
    .sort((a, b) => a.start.getTime() - b.start.getTime())

  const totals = new Map<string, TimesheetTotal>()
  for (const r of inWeek) {
    const t = totals.get(r.caregiverId) || {
      caregiverId: r.caregiverId,
      caregiver: r.caregiver,
      role: r.role,
      hours: 0,
      shifts: 0,
      verified: 0,
    }
    t.hours += r.hours
    t.shifts += 1
    if (r.checkInVerified && (r.checkOutVerified || r.end === null)) {
      t.verified += 1
    }
    totals.set(r.caregiverId, t)
  }

  return {
    weekStart,
    weekEnd,
    rows: inWeek,
    // paid staff first, then most hours
    totals: [...totals.values()].sort((a, b) => (a.role === b.role ? b.hours - a.hours : a.role === 'staff' ? -1 : 1)),
  }
}

export function serviceType(role: 'staff' | 'family'): string {
  return role === 'staff' ? 'Private duty nursing / personal care' : 'Family caregiving (unpaid)'
}

export function weekLabel(sheet: Timesheet): string {
  const lastDay = new Date(sheet.weekEnd.getTime() - 1)
  return `${formatDate(sheet.weekStart)} - ${formatDate(lastDay)}`
}

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

/**
 * CSV with the fields the federal EVV rule (21st Century Cures Act) asks for: type of service, individual
 * receiving it, individual providing it, date, location, and start/end time.
 */
export function timesheetCsv(sheet: Timesheet): string {
  const header = [
    'Date',
    'Caregiver',
    'Service type',
    'Individual receiving service',
    'Location',
    'Check-in time',
    'Check-out time',
    'Hours',
    'Check-in verified (door tag)',
    'Check-out verified (door tag)',
    'Flagged abnormal',
  ]
  const lines = sheet.rows.map((r) =>
    [
      toDateInput(r.start),
      r.caregiver,
      serviceType(r.role),
      patient.name,
      r.checkInVerified ? "Patient's home (NFC door tag)" : 'Not verified',
      formatTime(r.start.toISOString()),
      r.end ? formatTime(r.end.toISOString()) : 'In progress',
      r.hours.toFixed(2),
      r.checkInVerified ? 'Yes' : 'No',
      r.checkOutVerified ? 'Yes' : r.end ? 'No' : 'Pending',
      r.flagged ? 'Yes' : 'No',
    ]
      .map(csvCell)
      .join(','),
  )
  return [header.join(','), ...lines].join('\n')
}

export function timesheetFilename(sheet: Timesheet, ext: 'csv' | 'pdf'): string {
  return `${patient.name}-timesheet-week-of-${toDateInput(sheet.weekStart)}.${ext}`
}
