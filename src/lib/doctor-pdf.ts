// Doctor's note as a real PDF document (not a print of the web page).
// Loaded on demand from DoctorNotePage so jsPDF isn't in the main bundle.

import type { CellHookData } from 'jspdf-autotable'
import { patient } from '../data/patient'
import type { NoteSection } from '../types'
import { adherenceTotals, type DoctorReport } from './doctor'
import { formatDate, toDateInput } from './format'
import { ALERT, PdfWriter, type ChartImage } from './pdf-kit'

export function buildDoctorPdf(report: DoctorReport, sections: NoteSection[], charts: ChartImage[] = []) {
  const pdf = new PdfWriter('Home Care Report', 'Prepared for the treating physician')
  const totals = adherenceTotals(report)
  const period = `${formatDate(report.since)} - ${formatDate(report.until)}`

  // ---------- Patient block ----------
  const evvShifts = report.shifts.filter((s) => s.verified).length
  const careTeam = report.logsByCaregiver.map((c) => `${c.name} (${c.count})`).join(', ') || 'None'
  let gtube = `Last changed ${report.gtube.lastChange}; next change due ${report.gtube.due}`
  if (report.gtube.replacedInPeriod.length > 0) {
    gtube += `; replaced this period: ${report.gtube.replacedInPeriod.join(', ')}`
  }
  pdf.infoPanel([
    ['Patient', `${patient.name}, age ${patient.age}`],
    ['Background', patient.summary],
    ['Report period', `${period}  (${report.days} days, since last visit)`],
    ['Care team (entries)', careTeam],
    ['G-tube button', gtube],
    [
      'Shift verification',
      `${evvShifts} of ${report.shifts.length} shifts verified at the home's door tag at check-in and check-out (EVV)`,
    ],
  ])

  // ---------- Key figures ----------
  pdf.figures(
    [
      [`${totals.pct}%`, 'treatments on schedule'],
      [`${totals.done}/${totals.expected}`, 'scheduled treatments logged'],
      [String(report.missed.length), 'entries with skipped steps'],
      [String(report.notes.length + report.handoffNotes.length), 'caregiver notes'],
    ],
    totals.pct < 90 ? [0] : [],
  )

  // ---------- Narrative sections ----------
  for (const section of sections) {
    pdf.heading(section.title)
    pdf.bullets(section.bullets)
  }

  // ---------- Trends ----------
  if (charts.length > 0) {
    pdf.heading('Trends', 160)
    for (const chart of charts) {
      pdf.chart(chart)
    }
  }

  // ---------- Appendices ----------
  pdf.heading('Appendix A - Treatment log', 80)
  pdf.table(
    ['Treatment', 'Session', 'Logged', 'Scheduled', 'Rate'],
    report.adherence.map((r) => {
      let pct = '-'
      if (r.expected > 0) {
        pct = `${Math.round((r.done / r.expected) * 100)}%`
      }
      return [r.device, r.session, String(r.done), String(r.expected), pct]
    }),
    [2, 3, 4],
    {
      didParseCell: (data: CellHookData) => {
        const row = report.adherence[data.row.index]
        if (data.section === 'body' && data.column.index === 4) {
          data.cell.styles.fontStyle = 'bold'
          if (row && row.done < row.expected) {
            data.cell.styles.textColor = ALERT
          }
        }
      },
    },
  )

  if (report.measurements.length > 0) {
    pdf.heading('Appendix B - Measurements', 80)
    pdf.table(
      ['Measure', 'Device / session', 'Readings', 'Average', 'Range'],
      report.measurements.map((m) => [
        m.field,
        m.device,
        String(m.count),
        `${m.avg} ${m.unit}`.trim(),
        `${m.min} - ${m.max} ${m.unit}`.trim(),
      ]),
      [2, 3, 4],
    )
  }

  if (report.missed.length > 0) {
    pdf.heading('Appendix C - Skipped steps', 80)
    pdf.table(
      ['Date / time', 'Device', 'Session', 'Not done', 'Caregiver'],
      report.missed.map((m) => [m.when, m.device, m.session, m.items.join(', '), m.caregiver]),
    )
  }

  const allNotes = [...report.notes, ...report.handoffNotes]
  if (allNotes.length > 0) {
    pdf.heading(`Appendix ${report.missed.length > 0 ? 'D' : 'C'} - Caregiver notes (verbatim)`, 80)
    pdf.table(
      ['Date / time', 'Source', 'Caregiver', 'Note'],
      allNotes.map((n) => [n.when, n.device, n.caregiver, n.text]),
      [],
      { columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 80 }, 2: { cellWidth: 70 } } },
    )
  }

  // ---------- Sign-off ----------
  pdf.y += 6
  pdf.note(
    'Compiled from caregiver-entered home care logs. Narrative sections are generated from the logged data and ' +
      'should be reviewed alongside the appendices; they are not a diagnosis.',
  )
  pdf.signatures(['Reviewed by (physician)', 'Date'])

  return pdf.finish(`${patient.name} - Home Care Report - ${period}`)
}

export function doctorPdfFilename(): string {
  return `${patient.name}-care-report-${toDateInput(new Date())}.pdf`
}
