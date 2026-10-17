// Shared look for every PDF the app makes (doctor's note, timesheet): letterhead, section headings,
// tables, charts, signature lines, and a footer with page numbers. Built on jsPDF, US Letter, points.

import { jsPDF } from 'jspdf'
import { autoTable, type UserOptions } from 'jspdf-autotable'
import { formatDate } from './format'

export type RGB = [number, number, number]
export const TEAL: RGB = [27, 179, 176]
export const BROWN: RGB = [64, 49, 42]
export const COCOA: RGB = [117, 83, 57]
export const MIST: RGB = [225, 245, 244]
export const RULE: RGB = [214, 226, 225]
export const ALERT: RGB = [190, 40, 90]

const PAGE_W = 612
const PAGE_H = 792
export const M = 54 // page margin
export const CONTENT_W = PAGE_W - M * 2
const FOOTER_SPACE = 48

/** The built-in PDF fonts only cover Latin-1; swap the typographic characters the app uses. */
export function pdfText(s: string): string {
  return s
    .replace(/[–—]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, '...')
    .replace(/[•‣]/g, '-')
    .replace(/[^\x00-\xff]/g, '')
}

export interface ChartImage {
  title: string
  /** PNG data URL */
  dataUrl: string
  /** width / height of the source image */
  aspect: number
}

/** A PDF being written top to bottom; `y` is where the next thing goes. */
export class PdfWriter {
  doc = new jsPDF({ unit: 'pt', format: 'letter' })
  y = M

  /** Letterhead: teal band, title, subtitle line, red confidentiality label. */
  constructor(title: string, subtitle: string) {
    const { doc } = this
    doc.setFillColor(...TEAL).rect(0, 0, PAGE_W, 8, 'F')
    doc.setFont('helvetica', 'bold').setFontSize(20).setTextColor(...BROWN)
    doc.text(pdfText(title), M, this.y + 10)
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...COCOA)
    doc.text(pdfText(`${subtitle}  |  Generated ${formatDate(new Date())}`), M, this.y + 26)
    doc.setFont('helvetica', 'bold').setTextColor(...ALERT)
    doc.text('CONFIDENTIAL HEALTH INFORMATION', PAGE_W - M, this.y + 10, { align: 'right' })
    this.y += 44
  }

  ensureSpace(needed: number) {
    if (this.y + needed > PAGE_H - M - FOOTER_SPACE) {
      this.doc.addPage()
      this.y = M
    }
  }

  /** keepWith: room needed below the heading so it isn't stranded at the bottom of a page */
  heading(title: string, keepWith: number = 20) {
    const { doc } = this
    this.ensureSpace(30 + keepWith)
    this.y += 10
    doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(...TEAL)
    doc.text(pdfText(title.toUpperCase()), M, this.y)
    this.y += 5
    doc.setDrawColor(...TEAL).setLineWidth(0.75).line(M, this.y, M + CONTENT_W, this.y)
    this.y += 14
  }

  /** Label/value rows on a soft teal panel (patient block, timesheet details). */
  infoPanel(rows: [string, string][]) {
    autoTable(this.doc, {
      startY: this.y,
      margin: { left: M, right: M },
      body: rows.map(([k, v]) => [pdfText(k), pdfText(v)]),
      theme: 'plain',
      styles: {
        font: 'helvetica',
        fontSize: 9,
        textColor: BROWN,
        fillColor: MIST,
        cellPadding: { top: 3, bottom: 3, left: 10, right: 10 },
      },
      columnStyles: { 0: { fontStyle: 'bold', textColor: COCOA, cellWidth: 120 } },
    })
    this.y = this.lastTableY() + 16
  }

  /** Row of outlined boxes with a big value and a small label. alert = indexes drawn in red. */
  figures(items: [string, string][], alert: number[] = []) {
    const { doc } = this
    const gap = 10
    const boxW = (CONTENT_W - gap * (items.length - 1)) / items.length
    this.ensureSpace(66)
    items.forEach(([value, label], i) => {
      const x = M + i * (boxW + gap)
      doc.setDrawColor(...RULE).setLineWidth(0.75).roundedRect(x, this.y, boxW, 50, 4, 4, 'S')
      doc.setFont('helvetica', 'bold').setFontSize(16).setTextColor(...(alert.includes(i) ? ALERT : TEAL))
      doc.text(pdfText(value), x + boxW / 2, this.y + 23, { align: 'center' })
      doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...COCOA)
      doc.text(pdfText(label), x + boxW / 2, this.y + 38, { align: 'center' })
    })
    this.y += 66
  }

  bullets(items: string[]) {
    const { doc } = this
    doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...BROWN)
    for (const item of items) {
      const lines = doc.splitTextToSize(pdfText(item), CONTENT_W - 14) as string[]
      this.ensureSpace(lines.length * 13 + 4)
      doc.setFillColor(...TEAL).circle(M + 3, this.y - 3, 1.6, 'F')
      doc.text(lines, M + 14, this.y)
      this.y += lines.length * 13 + 4
    }
  }

  /** Striped table with a teal header. rightAligned: number columns (header and cells). */
  table(head: string[], body: string[][], rightAligned: number[] = [], options: Partial<UserOptions> = {}) {
    const columnStyles: UserOptions['columnStyles'] = {}
    for (const i of rightAligned) {
      columnStyles[i] = { halign: 'right' }
    }
    autoTable(this.doc, {
      startY: this.y,
      margin: { left: M, right: M, bottom: M + FOOTER_SPACE },
      theme: 'striped',
      styles: { font: 'helvetica', fontSize: 8.5, textColor: BROWN, cellPadding: 5, lineColor: RULE },
      headStyles: { fillColor: TEAL, textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [247, 251, 251] },
      head: [head.map((h, i) => ({ content: h, styles: { halign: rightAligned.includes(i) ? 'right' : 'left' } }))],
      body: body.map((r) => r.map(pdfText)),
      columnStyles,
      ...options,
    })
    this.y = this.lastTableY() + 12
  }

  /** A chart image at full content width, with a small caption above it. */
  chart(image: ChartImage) {
    const { doc } = this
    const h = CONTENT_W / image.aspect
    this.ensureSpace(h + 22)
    doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(...BROWN)
    doc.text(pdfText(image.title), M, this.y)
    this.y += 6
    doc.addImage(image.dataUrl, 'PNG', M, this.y, CONTENT_W, h)
    this.y += h + 14
  }

  /** Small italic note (disclaimers). */
  note(text: string) {
    const { doc } = this
    doc.setFont('helvetica', 'italic').setFontSize(8).setTextColor(...COCOA)
    const lines = doc.splitTextToSize(pdfText(text), CONTENT_W) as string[]
    this.ensureSpace(lines.length * 10 + 4)
    doc.text(lines, M, this.y)
    this.y += lines.length * 10 + 4
  }

  /** Signature lines side by side, e.g. ["Reviewed by (physician)", "Date"]. */
  signatures(labels: string[]) {
    const { doc } = this
    this.ensureSpace(60)
    this.y += 30
    const gap = 24
    const w = (CONTENT_W - gap * (labels.length - 1)) / labels.length
    labels.forEach((label, i) => {
      const x = M + i * (w + gap)
      doc.setDrawColor(...BROWN).setLineWidth(0.5).line(x, this.y, x + w, this.y)
      doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...COCOA)
      doc.text(pdfText(label), x, this.y + 12)
    })
    this.y += 24
  }

  /** Footer on every page; call last. */
  finish(footer: string): jsPDF {
    const { doc } = this
    const pages = doc.getNumberOfPages()
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i)
      doc.setDrawColor(...RULE).setLineWidth(0.5).line(M, PAGE_H - 40, PAGE_W - M, PAGE_H - 40)
      doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...COCOA)
      doc.text(pdfText(footer), M, PAGE_H - 28)
      doc.text(`Page ${i} of ${pages}`, PAGE_W - M, PAGE_H - 28, { align: 'right' })
    }
    return doc
  }

  private lastTableY(): number {
    return (this.doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY
  }
}
