import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Header } from '../components/Header'
import { BulletList } from '../components/SummaryCard'
import { Button, Card, Page, Section } from '../components/ui'
import { getDevice } from '../data/patient'
import { getShiftSummary } from '../lib/ai'
import { describeLog, formatTime, logNotes } from '../lib/format'
import { useStore } from '../lib/store'

/** End-of-shift handoff: review logs, add overall notes, generate summary, check out. */
export function HandoffPage() {
  const { onShift, shiftLogs, completeHandoff } = useStore()
  const navigate = useNavigate()
  const [overallNotes, setOverallNotes] = useState('')
  const [bullets, setBullets] = useState<string[] | null>(null)
  const [loading, setLoading] = useState(false)

  if (!onShift) {
    return (
      <Page>
        <Header title="Handoff" back />
        <main className="px-4 pt-4">
          <Card className="space-y-3">
            <p>No one is checked in right now.</p>
            <Link to="/checkin" className="flex min-h-12 items-center justify-center rounded-xl bg-brand font-semibold text-white">
              Check in
            </Link>
          </Card>
        </main>
      </Page>
    )
  }

  const caregiverName = onShift.name
  const logs = shiftLogs().sort((a, b) => a.timestamp.localeCompare(b.timestamp))

  async function handleGenerate() {
    setLoading(true)
    const result = await getShiftSummary(caregiverName, logs, overallNotes)
    setBullets(result)
    setLoading(false)
  }

  function handleConfirm() {
    if (!bullets) {
      return
    }
    completeHandoff(overallNotes, bullets)
    navigate('/')
  }

  let generateLabel = 'Generate summary'
  if (loading) {
    generateLabel = 'Summarizing…'
  }

  return (
    <Page>
      <Header title="Handoff" back />
      <main className="px-4 pt-2">
        <Section title={`${caregiverName}'s shift`}>
          <Card className="space-y-3">
            {logs.length === 0 && <p className="text-sm text-gray-500">Nothing logged this shift.</p>}
            {logs.map((l) => {
              const device = getDevice(l.deviceId)
              const notes = logNotes(l)
              return (
                <div key={l.id} className="text-sm">
                  <div className="font-semibold">
                    {device?.name} · {formatTime(l.timestamp)}
                  </div>
                  <div className="text-gray-600">{describeLog(l)}</div>
                  {notes && <div className="text-gray-500 italic">{notes}</div>}
                </div>
              )
            })}
          </Card>
        </Section>

        <Section title="Overall notes">
          <textarea
            value={overallNotes}
            onChange={(e) => {
              setOverallNotes(e.target.value)
              setBullets(null) // notes changed: summary must be regenerated
            }}
            placeholder="Anything the next caregiver should know (optional)"
            rows={4}
            className="w-full rounded-xl border border-gray-300 bg-white p-3"
          />
        </Section>

        <div className="mt-4 space-y-3">
          {!bullets && (
            <Button onClick={handleGenerate} disabled={loading}>
              {generateLabel}
            </Button>
          )}
          {bullets && (
            <>
              <Card className="bg-brand-2/15">
                <h3 className="mb-2 font-display font-bold">Summary for next caregiver</h3>
                <BulletList bullets={bullets} />
              </Card>
              <Button onClick={handleConfirm}>Hand off & check out</Button>
              <Button variant="ghost" onClick={handleGenerate} disabled={loading}>
                Regenerate
              </Button>
            </>
          )}
        </div>
      </main>
    </Page>
  )
}
