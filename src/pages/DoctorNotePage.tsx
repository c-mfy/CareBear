import { useState } from 'react'
import { Header } from '../components/Header'
import { BulletList } from '../components/SummaryCard'
import { TrendCharts } from '../components/TrendCharts'
import { Button, Card, Page, Section, Tag } from '../components/ui'
import { patient } from '../data/patient'
import { getDoctorNote } from '../lib/ai-client'
import { chartSpecs, renderChartImages } from '../lib/charts'
import { adherenceTotals, buildDoctorReport, noteAsText } from '../lib/doctor'
import { formatDate, toDateInput } from '../lib/format'
import { useStore } from '../lib/store'
import { buildTrends } from '../lib/trends'
import type { NoteSection } from '../types'

/** Doctor's note: a detailed report of everything logged since the last doctor's visit. */
export function DoctorNotePage() {
  const { state, setLastDoctorVisit } = useStore()
  const [sections, setSections] = useState<NoteSection[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [confirmingVisit, setConfirmingVisit] = useState(false)
  const [makingPdf, setMakingPdf] = useState(false)

  const report = buildDoctorReport(state)
  const specs = chartSpecs(buildTrends(state))
  const totals = adherenceTotals(report)
  const today = toDateInput(new Date())

  async function handleGenerate() {
    setLoading(true)
    setSections(await getDoctorNote(report))
    setLoading(false)
  }

  function handleSinceChange(value: string) {
    if (!value || value > today) {
      return
    }
    setLastDoctorVisit(value)
    setSections(null) // period changed: note must be regenerated
  }

  async function handleCopy() {
    if (!sections) {
      return
    }
    try {
      await navigator.clipboard.writeText(noteAsText(report, sections))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard blocked: the note is still on screen to select by hand
    }
  }

  async function handlePdf() {
    if (!sections) {
      return
    }
    setMakingPdf(true)
    try {
      // loaded on demand: jsPDF is large and only this button needs it
      const { buildDoctorPdf, doctorPdfFilename } = await import('../lib/doctor-pdf')
      let charts: Awaited<ReturnType<typeof renderChartImages>> = []
      try {
        charts = await renderChartImages(specs)
      } catch {
        // charts are a bonus: still make the PDF without them
      }
      buildDoctorPdf(report, sections, charts).save(doctorPdfFilename())
    } finally {
      setMakingPdf(false)
    }
  }

  function handleVisitDone() {
    setLastDoctorVisit(today)
    setSections(null)
    setConfirmingVisit(false)
  }

  let generateLabel = "Generate doctor's note"
  if (loading) {
    generateLabel = 'Writing note…'
  }

  return (
    <Page>
      <Header title="Doctor's note" back />
      <main className="px-4 pt-2">
        {/* Period */}
        <Card>
          <h1 className="text-lg font-bold">Care report for {patient.name}</h1>
          <label className="mt-2 flex items-center justify-between gap-3 text-sm">
            <span className="text-cocoa">Since last doctor's visit</span>
            <input
              type="date"
              value={state.lastDoctorVisit}
              max={today}
              onChange={(e) => handleSinceChange(e.target.value)}
              className="rounded-xl bg-lilac px-3 py-2 text-sm font-semibold outline-none print:hidden"
            />
            <span className="hidden font-semibold print:inline">{formatDate(report.since)}</span>
          </label>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <Stat value={String(report.days)} label="days" />
            <Stat value={String(report.totalLogs)} label="entries" />
            <Stat value={`${totals.pct}%`} label="on schedule" />
          </div>
        </Card>

        {/* AI write-up */}
        <div className="mt-4 space-y-3">
          {!sections && (
            <Button onClick={handleGenerate} disabled={loading || report.totalLogs === 0}>
              {generateLabel}
            </Button>
          )}
          {!sections && report.totalLogs === 0 && (
            <p className="text-center text-xs text-cocoa">Nothing has been logged since this date.</p>
          )}
          {sections && (
            <>
              <Card className="space-y-4 border-l-[5px] border-teal">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-bold">
                    {formatDate(report.since)} – {formatDate(report.until)}
                  </h2>
                  <Tag className="bg-mist text-teal print:hidden">✦ AI written</Tag>
                </div>
                {sections.map((s) => (
                  <div key={s.title}>
                    <h3 className="mb-1.5 text-xs font-bold tracking-wider text-teal uppercase">{s.title}</h3>
                    <BulletList bullets={s.bullets} />
                  </div>
                ))}
              </Card>
              <div className="flex gap-3 print:hidden">
                <Button variant="ghost" onClick={handleCopy}>
                  {copied ? 'Copied ✓' : 'Copy text'}
                </Button>
                <Button variant="ghost" onClick={handlePdf} disabled={makingPdf}>
                  {makingPdf ? 'Making PDF…' : 'Download PDF'}
                </Button>
              </div>
              <Button variant="ghost" onClick={handleGenerate} disabled={loading} className="print:hidden">
                {loading ? 'Writing note…' : '↻ Regenerate'}
              </Button>
            </>
          )}
        </div>

        {/* The numbers the note is based on, always shown */}
        <Section title="Trends">
          <TrendCharts specs={specs} />
        </Section>

        <Section title="Treatment log">
          <Card className="overflow-x-auto p-0">
            <table className="w-full text-left text-[13px]">
              <thead className="text-xs text-cocoa">
                <tr>
                  <th className="px-4 pt-3 pb-1 font-semibold">Treatment</th>
                  <th className="px-4 pt-3 pb-1 text-right font-semibold">Logged</th>
                </tr>
              </thead>
              <tbody>
                {report.adherence.map((r) => (
                  <tr key={`${r.device}-${r.session}`} className="border-t border-lilac">
                    <td className="px-4 py-2">
                      <span className="font-semibold">{r.device}</span>{' '}
                      <span className="text-cocoa">· {r.session}</span>
                    </td>
                    <td className={`px-4 py-2 text-right font-semibold ${r.done < r.expected ? 'text-rose' : ''}`}>
                      {r.done}/{r.expected}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </Section>

        {report.measurements.length > 0 && (
          <Section title="Measurements">
            <Card className="space-y-2 text-[13px]">
              {report.measurements.map((m) => (
                <div key={`${m.device}-${m.field}`} className="flex justify-between gap-3">
                  <span>
                    <span className="font-semibold">{m.field}</span> <span className="text-cocoa">· {m.device}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    avg {m.avg} {m.unit}
                    <span className="block text-xs text-cocoa">
                      {m.min}–{m.max}, n={m.count}
                    </span>
                  </span>
                </div>
              ))}
            </Card>
          </Section>
        )}

        <Section title="Skipped steps & notes">
          <Card className="space-y-2 text-[13px]">
            {report.missed.length === 0 && report.notes.length === 0 && report.handoffNotes.length === 0 && (
              <p className="text-cocoa">Nothing skipped or noted in this period.</p>
            )}
            {report.missed.map((m, i) => (
              <p key={`m${i}`}>
                <span className="text-xs text-cocoa">{m.when} · {m.caregiver}</span>
                <br />
                <b>{m.device}</b> <span className="text-rose">not done: {m.items.join(', ')}</span>
              </p>
            ))}
            {[...report.notes, ...report.handoffNotes].map((n, i) => (
              <p key={`n${i}`}>
                <span className="text-xs text-cocoa">{n.when} · {n.caregiver}</span>
                <br />
                <b>{n.device}</b> “{n.text}”
              </p>
            ))}
          </Card>
        </Section>

        <div className="mt-6 print:hidden">
          {!confirmingVisit && (
            <Button variant="ghost" onClick={() => setConfirmingVisit(true)}>
              Doctor's visit done today
            </Button>
          )}
          {confirmingVisit && (
            <Card className="space-y-3">
              <p className="text-sm">Start a new report period from today? The next note will only cover care from now on.</p>
              <div className="flex gap-3">
                <Button onClick={handleVisitDone}>Yes, start new period</Button>
                <Button variant="ghost" onClick={() => setConfirmingVisit(false)}>
                  Cancel
                </Button>
              </div>
            </Card>
          )}
        </div>
      </main>
    </Page>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl bg-lilac py-2">
      <div className="text-lg leading-tight font-bold">{value}</div>
      <div className="text-[11px] text-cocoa">{label}</div>
    </div>
  )
}
