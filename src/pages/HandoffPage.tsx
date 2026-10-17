import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '../components/Header'
import { BulletList } from '../components/SummaryCard'
import { DeviceIcon } from '../components/icons'
import { Button, Card, Dot, FlagMark, Page, Section, Tag } from '../components/ui'
import { getDevice } from '../data/patient'
import { getShiftSummary } from '../lib/ai-client'
import { cx } from '../lib/cx'
import { describeLog, formatTime, logNotes } from '../lib/format'
import { useStore } from '../lib/store'
import { describeOverdue, overdueDuringShift } from '../lib/tasks'

/** End-of-shift handoff: review logs, add overall notes, generate summary, check out. */
export function HandoffPage() {
  const { state, onShift, shiftLogs, completeHandoff } = useStore()
  const navigate = useNavigate()
  const [overallNotes, setOverallNotes] = useState('')
  // null = caregiver hasn't touched the flag, so it follows the overdue check
  const [flagChoice, setFlagChoice] = useState<boolean | null>(null)
  const [bullets, setBullets] = useState<string[] | null>(null)
  const [editingSummary, setEditingSummary] = useState(false)
  const [draftSummary, setDraftSummary] = useState('')
  const [loading, setLoading] = useState(false)

  if (!onShift) {
    return (
      <Page>
        <Header title="Shift report" back />
        <main className="px-4 pt-3">
          <Card className="space-y-3">
            <p className="text-sm">No one is checked in right now. Tap the door tag to start a shift.</p>
          </Card>
        </main>
      </Page>
    )
  }

  const caregiverName = onShift.name
  let onShiftStart = new Date().toISOString()
  if (state.currentShift) {
    onShiftStart = state.currentShift.start
  }
  const logs = shiftLogs().sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  const overdueReasons = overdueDuringShift(state.logs, new Date(onShiftStart)).map(describeOverdue)
  const autoFlagged = overdueReasons.length > 0
  const flagged = flagChoice ?? autoFlagged

  async function handleGenerate() {
    setLoading(true)
    const result = await getShiftSummary(caregiverName, logs, overallNotes)
    setBullets(result)
    setEditingSummary(false)
    setLoading(false)
  }

  function handleEdit() {
    if (!bullets) {
      return
    }
    setDraftSummary(bullets.join('\n'))
    setEditingSummary(true)
  }

  function handleSaveEdits() {
    const editedBullets = draftSummary
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
    if (editedBullets.length === 0) {
      return
    }
    setBullets(editedBullets)
    setEditingSummary(false)
  }

  function handleConfirm() {
    if (!bullets) {
      return
    }
    completeHandoff(overallNotes, bullets, flagged, overdueReasons)
    navigate('/')
  }

  let generateLabel = 'Generate summary'
  if (loading) {
    generateLabel = 'Summarizing…'
  }

  // Summary card body: edit box or bullets
  let summaryBody = <BulletList bullets={bullets || []} />
  if (editingSummary) {
    summaryBody = (
      <>
        <textarea
          value={draftSummary}
          onChange={(e) => setDraftSummary(e.target.value)}
          aria-label="Edit summary"
          rows={Math.max(4, (bullets || []).length)}
          className="w-full rounded-xl bg-lilac p-3 text-sm outline-none"
        />
        <p className="mt-2 text-xs text-cocoa">Use one line for each summary bullet.</p>
      </>
    )
  }

  // Buttons under the summary
  let summaryActions = (
    <>
      <Button onClick={handleConfirm}>Hand off & check out ✓</Button>
      <div className="flex gap-3">
        <Button variant="ghost" onClick={handleEdit}>
          Edit summary
        </Button>
        <Button variant="ghost" onClick={handleGenerate} disabled={loading}>
          ↻ Regenerate
        </Button>
      </div>
    </>
  )
  if (editingSummary) {
    summaryActions = (
      <div className="flex gap-3">
        <Button onClick={handleSaveEdits} disabled={!draftSummary.trim()}>
          Save edits
        </Button>
        <Button variant="ghost" onClick={() => setEditingSummary(false)}>
          Cancel
        </Button>
      </div>
    )
  }

  return (
    <Page>
      <Header title="Shift report" back />
      <main className="px-4 pt-2">
        {/* Shift card */}
        <Card>
          <p className="text-xs text-cocoa">Outgoing</p>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-[15px] font-bold">
              <Dot color={onShift.color} /> {caregiverName}
            </span>
            <span className="text-xs text-cocoa">
              {formatTime(onShiftStart)} – now · {logs.length} logged
            </span>
          </div>
          <p className="mt-1 text-xs font-semibold text-teal">✓ Checked in at door tag (EVV)</p>
        </Card>

        <Section title="Logged this shift">
          <Card className="space-y-3">
            {logs.length === 0 && <p className="text-sm text-cocoa">Nothing logged this shift.</p>}
            {logs.map((l) => {
              const device = getDevice(l.deviceId)
              const notes = logNotes(l)
              return (
                <div key={l.id} className="flex gap-3 text-[13px]">
                  <DeviceIcon deviceId={l.deviceId} size={28} />
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between font-semibold">
                      <span>{device?.name}</span>
                      <span className="text-xs font-medium text-cocoa">{formatTime(l.timestamp)}</span>
                    </div>
                    <div className="text-cocoa">{describeLog(l)}</div>
                    {notes && <div className="mt-0.5 text-rose">“{notes}”</div>}
                  </div>
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
            rows={3}
            className="w-full rounded-2xl bg-white p-4 text-sm outline-none"
          />
          <button
            onClick={() => setFlagChoice(!flagged)}
            aria-pressed={flagged}
            className={cx(
              'mt-2 flex min-h-12 w-full items-center gap-3 rounded-2xl px-4 text-left text-sm font-semibold',
              flagged && 'bg-rose text-white',
              !flagged && 'border-[1.5px] border-dashed border-rose bg-white text-brown',
            )}
          >
            <FlagMark className={cx(flagged && 'bg-white text-rose')} />
            <span className="flex-1">
              {flagged ? 'Flagged: something abnormal this shift' : 'Flag something abnormal this shift'}
            </span>
            <span className="text-xs font-medium">{flagged ? 'Unflag' : 'Tap to flag'}</span>
          </button>
          {autoFlagged && (
            <div className="mt-2 rounded-2xl bg-white px-4 py-3 text-[13px]">
              <p className="font-semibold text-rose">
                {flagged ? 'Auto-flagged: overdue this shift' : 'Unflagged, but these were overdue this shift'}
              </p>
              <ul className="mt-1 space-y-0.5 text-cocoa">
                {overdueReasons.map((r) => (
                  <li key={r}>• {r}</li>
                ))}
              </ul>
            </div>
          )}
        </Section>

        <div className="mt-4 space-y-3">
          {!bullets && (
            <Button onClick={handleGenerate} disabled={loading}>
              {generateLabel}
            </Button>
          )}
          {bullets && (
            <>
              <Card className="border-l-[5px] border-teal">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold">Summary for next caregiver</h3>
                  <Tag className="bg-mist text-teal">✦ AI summary</Tag>
                </div>
                {summaryBody}
              </Card>
              {summaryActions}
            </>
          )}
        </div>
      </main>
    </Page>
  )
}
