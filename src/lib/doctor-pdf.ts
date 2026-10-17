// Doctor's note as a real PDF document (not a print of the web page).
// Loaded on demand from DoctorNotePage so jsPDF isn't in the main bundle.

import { jsPDF } from 'jspdf'
import { autoTable, type CellHookData, type UserOptions } from 'jspdf-autotable'
import { patient } from '../data/patient'
import type { NoteSection } from '../types'
import { adherenceTotals, type DoctorReport } from './doctor'
import { formatDate, toDateInput } from './format'

type RGB = [number, number, number]
const TEAL: RGB = [27, 179, 176]
const BROWN: RGB = [64, 49, 42]
const COCOA: RGB = [117, 83, 57]
const MIST: RGB = [225, 245, 244]
const RULE: RGB = [214, 226, 225]
const ALERT: RGB = [190, 40, 90]

const PAGE_W = 612 // US Letter, in points
const PAGE_H = 792
const M = 54 // page margin
const CONTENT_W = PAGE_W - M * 2
const FOOTER_SPACE = 48

/** The built-in PDF fonts only cover Latin-1; swap the typographic characters the app uses. */
function pdfText(s: string): string {
  return s
    .replace(/[–—]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, '...')
    .replace(/[•‣]/g, '-')
    .replace(/[^\x00-\xff]/g, '')
}

function lastTableY(doc: jsPDF): number {
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY
}

export function buildDoctorPdf(report: DoctorReport, sections: NoteSection[]): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  const totals = adherenceTotals(report)
  const period = `${formatDate(report.since)} - ${formatDate(report.until)}`
  let y = M

  function ensureSpace(needed: number) {
    if (y + needed > PAGE_H - M - FOOTER_SPACE) {
      doc.addPage()
      y = M
    }
  }

  /** keepWith: room needed below the heading so it isn't stranded at the bottom of a page */
  function heading(title: string, keepWith: number = 20) {
    ensureSpace(30 + keepWith)
    y += 10
    doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(...TEAL)
    doc.text(pdfText(title.toUpperCase()), M, y)
    y += 5
    doc.setDrawColor(...TEAL).setLineWidth(0.75).line(M, y, M + CONTENT_W, y)
    y += 14
  }

  // ---------- Letterhead ----------
  doc.setFillColor(...TEAL).rect(0, 0, PAGE_W, 8, 'F')
  doc.setFont('helvetica', 'bold').setFontSize(20).setTextColor(...BROWN)
  doc.text('Home Care Report', M, y + 10)
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...COCOA)
  doc.text(`Prepared for the treating physician  |  Generated ${formatDate(new Date())}`, M, y + 26)
  doc.setFont('helvetica', 'bold').setTextColor(...ALERT)
  doc.text('CONFIDENTIAL HEALTH INFORMATION', PAGE_W - M, y + 10, { align: 'right' })
  y += 44

  // ---------- Patient block ----------
  const evvShifts = report.shifts.filter((s) => s.verified).length
  const careTeam = report.logsByCaregiver.map((c) => `${c.name} (${c.count})`).join(', ') || 'None'
  let gtube = `Last changed ${report.gtube.lastChange}; next change due ${report.gtube.due}`
  if (report.gtube.replacedInPeriod.length > 0) {
    gtube += `; replaced this period: ${report.gtube.replacedInPeriod.join(', ')}`
  }
  const info: [string, string][] = [
    ['Patient', `${patient.name}, age ${patient.age}`],
    ['Background', patient.summary],
    ['Report period', `${period}  (${report.days} days, since last visit)`],
    ['Care team (entries)', careTeam],
    ['G-tube button', gtube],
    ['Shift verification', `${evvShifts} of ${report.shifts.length} shifts checked in at the home's door tag (EVV)`],
  ]
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    body: info.map(([k, v]) => [k, pdfText(v)]),
    theme: 'plain',
    styles: { font: 'helvetica', fontSize: 9, textColor: BROWN, cellPadding: { top: 3, bottom: 3, left: 10, right: 10 } },
    columnStyles: { 0: { fontStyle: 'bold', textColor: COCOA, cellWidth: 120 } },
    didParseCell: (data) => {
      data.cell.styles.fillColor = MIST
    },
  })
  y = lastTableY(doc) + 16

  // ---------- Key figures ----------
  const figures: [string, string][] = [
    [`${totals.pct}%`, 'treatments on schedule'],
    [`${totals.done}/${totals.expected}`, 'scheduled treatments logged'],
    [String(report.missed.length), 'entries with skipped steps'],
    [String(report.notes.length + report.handoffNotes.length), 'caregiver notes'],
  ]
  const gap = 10
  const boxW = (CONTENT_W - gap * (figures.length - 1)) / figures.length
  figures.forEach(([value, label], i) => {
    const x = M + i * (boxW + gap)
    doc.setDrawColor(...RULE).setLineWidth(0.75).roundedRect(x, y, boxW, 50, 4, 4, 'S')
    doc.setFont('helvetica', 'bold').setFontSize(16).setTextColor(...(i === 0 && totals.pct < 90 ? ALERT : TEAL))
    doc.text(value, x + boxW / 2, y + 23, { align: 'center' })
    doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...COCOA)
    doc.text(label, x + boxW / 2, y + 38, { align: 'center' })
  })
  y += 66

  // ---------- Narrative sections ----------
  for (const section of sections) {
    heading(section.title)
    doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...BROWN)
    for (const bullet of section.bullets) {
      const lines = doc.splitTextToSize(pdfText(bullet), CONTENT_W - 14) as string[]
      ensureSpace(lines.length * 13 + 4)
      doc.setFillColor(...TEAL).circle(M + 3, y - 3, 1.6, 'F')
      doc.text(lines, M + 14, y)
      y += lines.length * 13 + 4
    }
  }

  // ---------- Data tables ----------
  const tableBase = {
    margin: { left: M, right: M, bottom: M + FOOTER_SPACE },
    theme: 'striped' as const,
    styles: { font: 'helvetica', fontSize: 8.5, textColor: BROWN, cellPadding: 5, lineColor: RULE },
    headStyles: { fillColor: TEAL, textColor: [255, 255, 255] as RGB, fontStyle: 'bold' as const },
    alternateRowStyles: { fillColor: [247, 251, 251] as RGB },
  }

  /** rightAligned: column indexes holding numbers (header and cells both right-aligned) */
  function table(
    title: string,
    head: string[],
    body: string[][],
    rightAligned: number[] = [],
    options: Partial<UserOptions> = {},
  ) {
    heading(title, 80) // header row + a couple of body rows
    const columnStyles: UserOptions['columnStyles'] = {}
    for (const i of rightAligned) {
      columnStyles[i] = { halign: 'right' }
    }
    autoTable(doc, {
      ...tableBase,
      startY: y,
      head: [head.map((h, i) => ({ content: h, styles: { halign: rightAligned.includes(i) ? 'right' : 'left' } }))],
      body: body.map((r) => r.map(pdfText)),
      columnStyles,
      ...options,
    })
    y = lastTableY(doc) + 12
  }

  table(
    'Appendix A - Treatment log',
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
    table(
      'Appendix B - Measurements',
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
    table(
      'Appendix C - Skipped steps',
      ['Date / time', 'Device', 'Session', 'Not done', 'Caregiver'],
      report.missed.map((m) => [m.when, m.device, m.session, m.items.join(', '), m.caregiver]),
    )
  }

  const allNotes = [...report.notes, ...report.handoffNotes]
  if (allNotes.length > 0) {
    table(
      `Appendix ${report.missed.length > 0 ? 'D' : 'C'} - Caregiver notes (verbatim)`,
      ['Date / time', 'Source', 'Caregiver', 'Note'],
      allNotes.map((n) => [n.when, n.device, n.caregiver, n.text]),
      [],
      { columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 80 }, 2: { cellWidth: 70 } } },
    )
  }

  // ---------- Sign-off ----------
  y += 6
  ensureSpace(90)
  doc.setFont('helvetica', 'italic').setFontSize(8).setTextColor(...COCOA)
  const disclaimer = doc.splitTextToSize(
    'Compiled from caregiver-entered home care logs. Narrative sections are generated from the logged data and ' +
      'should be reviewed alongside the appendices; they are not a diagnosis.',
    CONTENT_W,
  ) as string[]
  doc.text(disclaimer, M, y)
  y += disclaimer.length * 10 + 34
  doc.setDrawColor(...BROWN).setLineWidth(0.5)
  doc.line(M, y, M + 250, y)
  doc.line(M + 300, y, M + CONTENT_W, y)
  doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...COCOA)
  doc.text('Reviewed by (physician)', M, y + 12)
  doc.text('Date', M + 300, y + 12)

  // ---------- Footer on every page ----------
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setDrawColor(...RULE).setLineWidth(0.5).line(M, PAGE_H - 40, PAGE_W - M, PAGE_H - 40)
    doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...COCOA)
    doc.text(pdfText(`${patient.name} - Home Care Report - ${period}`), M, PAGE_H - 28)
    doc.text(`Page ${i} of ${pages}`, PAGE_W - M, PAGE_H - 28, { align: 'right' })
  }

  return doc
}

export function doctorPdfFilename(): string {
  return `${patient.name}-care-report-${toDateInput(new Date())}.pdf`
}
