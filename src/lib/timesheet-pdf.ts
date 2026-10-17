// Timesheet / EVV record as a PDF. Loaded on demand from TimesheetPage.

import type { CellHookData } from 'jspdf-autotable'
import { patient } from '../data/patient'
import { formatTime } from './format'
import { ALERT, PdfWriter } from './pdf-kit'
import { serviceType, weekLabel, type Timesheet } from './timesheet'

function dayLabel(d: Date): string {
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}

export function buildTimesheetPdf(sheet: Timesheet, staffOnly: boolean) {
  const pdf = new PdfWriter('Caregiver Timesheet', 'Electronic Visit Verification (EVV) record')
  const week = weekLabel(sheet)
  const totalHours = sheet.totals.reduce((a, t) => a + t.hours, 0)
  const verified = sheet.totals.reduce((a, t) => a + t.verified, 0)
  const flagged = sheet.rows.filter((r) => r.flagged).length

  pdf.infoPanel([
    ['Individual receiving service', `${patient.name}, age ${patient.age}`],
    ['Pay period', `${week} (Monday - Sunday)`],
    ['Location', "Patient's home, verified by NFC tag at the front door"],
    ['Caregivers included', staffOnly ? 'Paid staff only' : 'All caregivers (paid staff and family)'],
    ['Hours', 'Check-in to check-out, rounded to the nearest quarter hour'],
  ])

  pdf.figures(
    [
      [totalHours.toFixed(2), 'total hours'],
      [String(sheet.rows.length), 'shifts'],
      [`${verified}/${sheet.rows.length}`, 'shifts door-tag verified'],
      [String(flagged), 'shifts flagged abnormal'],
    ],
    verified < sheet.rows.length ? [2] : [],
  )

  if (sheet.rows.length === 0) {
    pdf.heading('Shifts')
    pdf.bullets(['No shifts recorded this week.'])
  }

  for (const total of sheet.totals) {
    const rows = sheet.rows.filter((r) => r.caregiverId === total.caregiverId)
    pdf.heading(`${total.caregiver} - ${serviceType(total.role)} - ${total.hours.toFixed(2)} hrs`, 80)
    pdf.table(
      ['Date', 'Check in', 'Check out', 'Hours', 'EVV in', 'EVV out', 'Notes'],
      rows.map((r) => {
        const notes: string[] = []
        if (r.flagged) {
          notes.push('Flagged abnormal')
        }
        if (r.missedCheckout) {
          notes.push('Missed check-out?')
        }
        return [
          dayLabel(r.start),
          formatTime(r.start.toISOString()),
          r.end ? formatTime(r.end.toISOString()) : 'In progress',
          r.hours.toFixed(2),
          r.checkInVerified ? 'Yes' : 'No',
          r.checkOutVerified ? 'Yes' : r.end ? 'No' : 'Pending',
          notes.join('; '),
        ]
      }),
      [3],
      {
        foot: [['Total', '', '', total.hours.toFixed(2), '', '', '']],
        footStyles: { fillColor: [247, 251, 251], textColor: [64, 49, 42], fontStyle: 'bold' },
        columnStyles: { 3: { halign: 'right' } },
        didParseCell: (data: CellHookData) => {
          const unverified = data.cell.raw === 'No'
          if (data.section === 'body' && (data.column.index === 4 || data.column.index === 5) && unverified) {
            data.cell.styles.textColor = ALERT
            data.cell.styles.fontStyle = 'bold'
          }
          if (data.section === 'body' && data.column.index === 6 && data.cell.raw) {
            data.cell.styles.textColor = ALERT
          }
          if (data.section === 'foot' && data.column.index === 3) {
            data.cell.styles.halign = 'right'
          }
        },
      },
    )
  }

  pdf.y += 6
  pdf.note(
    'Check-in and check-out times are recorded when the caregiver taps the NFC tag mounted at the front door of ' +
      "the patient's home. Shifts that were not verified at both ends are marked in red and need review.",
  )
  pdf.signatures(['Caregiver signature', 'Agency / supervisor', 'Date'])

  return pdf.finish(`${patient.name} - Caregiver Timesheet - ${week}`)
}
