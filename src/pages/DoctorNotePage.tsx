import { useEffect, useState } from 'react'
import { Header } from '../components/Header'
import { BulletList } from '../components/SummaryCard'
import { TrendCharts } from '../components/TrendCharts'
import { Button, Card, Page, Section, Tag } from '../components/ui'
import { patient } from '../data/patient'
import { getDoctorNote } from '../lib/ai-client'
import { chartSpecs, renderChartImages } from '../lib/charts'
import { adherenceTotals, buildDoctorReport, detailSections, mockDoctorSummary, noteAsText } from '../lib/doctor'
import { toDateInput } from '../lib/format'
import { loadCached, saveCached } from '../lib/storage'
import { useStore } from '../lib/store'
import { buildTrends } from '../lib/trends'
import type { DoctorSummary } from '../types'

/**
 * Doctor's note: a brief summary of trends since the last doctor's visit at the top (AI when available),
 * then the charts and tables it's based on.
 */
export function DoctorNotePage() {
  const { state, setLastDoctorVisit } = useStore()
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [confirmingVisit, setConfirmingVisit] = useState(false)
  const [makingPdf, setMakingPdf] = useState(false)

  const report = buildDoctorReport(state)
  const trends = buildTrends(state)
  const specs = chartSpecs(trends)
  const totals = adherenceTotals(report)
  const today = toDateInput(new Date())

  // Changes only when the data behind the summary does, so the AI isn't re-asked on every visit
  const key = JSON.stringify([state.lastDoctorVisit, state.logs.length, state.handoffs.map((h) => [h.id, h.flagged])])
  const [ai, setAi] = useState<{ key: string; summary: DoctorSummary } | null>(() => {
    const cached = loadCached<DoctorSummary>('doctor-summary', key)
    return cached ? { key, summary: cached } : null
  })
  const fromAi = ai?.key === key
  const summary = fromAi ? ai.summary : mockDoctorSummary(report, trends)

  async function askAi() {
    setLoading(true)
    const result = await getDoctorNote(report, trends)
    if (result.source === 'ai') {
      saveCached('doctor-summary', key, result.summary)
      setAi({ key, summary: result.summary })
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!fromAi && report.totalLogs > 0) {
      askAi()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  function handleSinceChange(value: string) {
    if (!value || value > today) {
      return
    }
    setLastDoctorVisit(value) // the key changes, so the summary is rewritten for the new period
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(noteAsText(report, summary))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard blocked: the note is still on screen to select by hand
    }
  }

  async function handlePdf() {
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
      buildDoctorPdf(report, summary, charts).save(doctorPdfFilename())
    } finally {
      setMakingPdf(false)
    }
  }

  function handleVisitDone() {
    setLastDoctorVisit(today)
    setConfirmingVisit(false)
  }

  return (
    <Page>
      <Header title="Doctor's note" back />
      <main className="px-4 pt-2">
        {/* Period + summary */}
        <Card>
          <h1 className="text-lg font-bold">Care report for {patient.name}</h1>
          <label className="mt-2 flex items-center justify-between gap-3 text-sm">
            <span className="text-cocoa">Since last doctor's visit</span>
            <input
              type="date"
              value={state.lastDoctorVisit}
              max={today}
              onChange={(e) => handleSinceChange(e.target.value)}
              className="rounded-xl bg-lilac px-3 py-2 text-sm font-semibold outline-none"
            />
          </label>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <Stat value={String(report.days)} label="days" />
            <Stat value={String(report.totalLogs)} label="entries" />
            <Stat value={`${totals.pct}%`} label="on schedule" />
          </div>

          {report.totalLogs === 0 && (
            <p className="mt-4 text-sm text-cocoa">Nothing has been logged since this date.</p>
          )}
          {report.totalLogs > 0 && (
            <div className="mt-4 border-t border-lilac pt-3">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold">Summary</h2>
                {fromAi ? (
                  <Tag className="bg-mist text-teal">✦ AI summary</Tag>
                ) : (
                  <Tag className="bg-lilac text-cocoa">{loading ? 'Writing AI summary…' : 'Auto summary'}</Tag>
                )}
              </div>
              <p className="text-[13px] leading-snug">{summary.overview}</p>
              {summary.trends.length > 0 && (
                <>
                  <h3 className="mt-3 mb-1.5 text-xs font-bold tracking-wider text-teal uppercase">Key trends</h3>
                  <BulletList bullets={summary.trends} />
                </>
              )}
            </div>
          )}
        </Card>

        {/* Full detail under the summary, computed from the logs */}
        {report.totalLogs > 0 && (
          <Card className="mt-3 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold">Details</h2>
              <Tag className="bg-lilac text-cocoa">From the logs</Tag>
            </div>
            {detailSections(report).map((s) => (
              <div key={s.title}>
                <h3 className="mb-1.5 text-xs font-bold tracking-wider text-teal uppercase">{s.title}</h3>
                <BulletList bullets={s.bullets} />
              </div>
            ))}
          </Card>
        )}

        {report.totalLogs > 0 && (
          <div className="mt-3 space-y-3">
            <div className="flex gap-3">
              <Button variant="ghost" onClick={handleCopy}>
                {copied ? 'Copied ✓' : 'Copy text'}
              </Button>
              <Button onClick={handlePdf} disabled={makingPdf}>
                {makingPdf ? 'Making PDF…' : 'Download PDF'}
              </Button>
            </div>
            <button
              onClick={askAi}
              disabled={loading}
              className="min-h-10 w-full text-xs font-semibold text-teal disabled:opacity-50"
            >
              {loading ? 'Writing summary…' : '↻ Regenerate summary'}
            </button>
          </div>
        )}

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
