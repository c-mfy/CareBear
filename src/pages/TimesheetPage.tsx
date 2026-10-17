import { useState } from 'react'
import { Header } from '../components/Header'
import { Button, Card, Dot, FlagMark, Page, Section } from '../components/ui'
import { cx } from '../lib/cx'
import { downloadBlob } from '../lib/download'
import { formatTime } from '../lib/format'
import { useStore } from '../lib/store'
import {
  addWeeks,
  buildTimesheet,
  serviceType,
  startOfWeek,
  timesheetCsv,
  timesheetFilename,
  weekLabel,
  type TimesheetRow,
} from '../lib/timesheet'
import { useNow } from '../lib/useNow'

/** Weekly timesheet / EVV record: every shift, door-tag verified at both ends, with CSV and PDF export. */
export function TimesheetPage() {
  const { state } = useStore()
  const now = useNow() // the open shift's hours keep counting
  const thisWeek = startOfWeek(now)
  const [weekStart, setWeekStart] = useState(thisWeek)
  const [staffOnly, setStaffOnly] = useState(true)
  const [makingPdf, setMakingPdf] = useState(false)

  const sheet = buildTimesheet(state, weekStart, staffOnly, now)
  const totalHours = sheet.totals.reduce((a, t) => a + t.hours, 0)
  const isThisWeek = weekStart.getTime() === thisWeek.getTime()
  const colorOf = (id: string) => state.caregivers.find((c) => c.id === id)?.color || '#755339'

  function handleCsv() {
    downloadBlob(new Blob([timesheetCsv(sheet)], { type: 'text/csv' }), timesheetFilename(sheet, 'csv'))
  }

  async function handlePdf() {
    setMakingPdf(true)
    try {
      // loaded on demand: jsPDF is large and only this button needs it
      const { buildTimesheetPdf } = await import('../lib/timesheet-pdf')
      buildTimesheetPdf(sheet, staffOnly).save(timesheetFilename(sheet, 'pdf'))
    } finally {
      setMakingPdf(false)
    }
  }

  return (
    <Page>
      <Header title="Timesheet" back />
      <main className="px-4 pt-2">
        {/* Week picker */}
        <Card className="flex items-center gap-2 p-2">
          <button
            onClick={() => setWeekStart(addWeeks(weekStart, -1))}
            aria-label="Previous week"
            className="h-11 w-11 shrink-0 rounded-full bg-lilac text-lg"
          >
            ‹
          </button>
          <div className="flex-1 text-center">
            <p className="text-sm font-bold">{weekLabel(sheet)}</p>
            <p className="text-xs text-cocoa">{isThisWeek ? 'This week' : 'Mon – Sun'}</p>
          </div>
          <button
            onClick={() => setWeekStart(addWeeks(weekStart, 1))}
            disabled={isThisWeek}
            aria-label="Next week"
            className="h-11 w-11 shrink-0 rounded-full bg-lilac text-lg disabled:opacity-30"
          >
            ›
          </button>
        </Card>

        {/* Who's included */}
        <div className="mt-2 flex gap-1 rounded-full bg-white p-1 text-xs font-semibold" role="radiogroup" aria-label="Caregivers">
          {(
            [
              [true, 'Paid staff'],
              [false, 'Everyone'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={label}
              role="radio"
              aria-checked={staffOnly === value}
              onClick={() => setStaffOnly(value)}
              className={cx('min-h-9 flex-1 rounded-full', staffOnly === value ? 'bg-teal text-white' : 'text-cocoa')}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Totals */}
        <Section title="Hours" right={<span className="text-xs font-semibold text-cocoa">{totalHours.toFixed(2)} total</span>}>
          <div className="space-y-2">
            {sheet.totals.length === 0 && (
              <Card>
                <p className="text-sm text-cocoa">No shifts this week.</p>
              </Card>
            )}
            {sheet.totals.map((t) => (
              <Card key={t.caregiverId} className="flex items-center gap-3 py-3">
                <Dot color={colorOf(t.caregiverId)} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{t.caregiver}</p>
                  <p className="text-xs text-cocoa">{serviceType(t.role)}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg leading-tight font-bold">{t.hours.toFixed(2)} hrs</p>
                  <p className={cx('text-xs', t.verified < t.shifts ? 'font-semibold text-rose' : 'text-cocoa')}>
                    {t.shifts} {t.shifts === 1 ? 'shift' : 'shifts'} · {t.verified}/{t.shifts} verified
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </Section>

        {/* Shifts */}
        {sheet.rows.length > 0 && (
          <Section title="Shifts">
            <Card className="space-y-0 p-0">
              {sheet.rows.map((r) => (
                <ShiftRow key={`${r.caregiverId}-${r.start.getTime()}`} row={r} color={colorOf(r.caregiverId)} />
              ))}
            </Card>
          </Section>
        )}

        <div className="mt-5 flex gap-3">
          <Button variant="ghost" onClick={handleCsv} disabled={sheet.rows.length === 0}>
            Export CSV
          </Button>
          <Button onClick={handlePdf} disabled={makingPdf || sheet.rows.length === 0}>
            {makingPdf ? 'Making PDF…' : 'Download PDF'}
          </Button>
        </div>
        <p className="mt-3 px-1 text-xs text-cocoa">
          Hours run from the door-tag check-in to the door-tag check-out, rounded to the quarter hour. Shifts are counted
          in the week they started.
        </p>
      </main>
    </Page>
  )
}

function ShiftRow({ row, color }: { row: TimesheetRow; color: string }) {
  const day = row.start.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
  return (
    <div className="flex items-center gap-3 border-t border-lilac px-4 py-3 first:border-t-0">
      <Dot color={color} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          {row.caregiver}
          {row.flagged && <FlagMark />}
        </p>
        <p className="text-xs text-cocoa">
          {day} · {formatTime(row.start.toISOString())} – {row.end ? formatTime(row.end.toISOString()) : 'now'}
        </p>
        <p className="mt-0.5 flex gap-2 text-[11px] font-semibold">
          <Evv ok={row.checkInVerified} label="In" />
          {row.end ? <Evv ok={row.checkOutVerified} label="Out" /> : <span className="text-teal">On shift</span>}
          {row.missedCheckout && <span className="text-rose">Missed check-out?</span>}
        </p>
      </div>
      <p className="shrink-0 text-sm font-bold">{row.hours.toFixed(2)}</p>
    </div>
  )
}

function Evv({ ok, label }: { ok: boolean; label: string }) {
  return <span className={ok ? 'text-teal' : 'text-rose'}>{ok ? `✓ ${label}` : `✕ ${label} not verified`}</span>
}
