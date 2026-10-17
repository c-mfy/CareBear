import { formatDateTime } from '../lib/format'
import { useCaregiver, useStore } from '../lib/store'
import type { Handoff } from '../types'
import { Card } from './ui'

export function BulletList({ bullets }: { bullets: string[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm">
      {bullets.map((b, i) => (
        <li key={i}>{b}</li>
      ))}
    </ul>
  )
}

function HandoffCard({ handoff }: { handoff: Handoff }) {
  const caregiver = useCaregiver(handoff.caregiverId)
  let name = 'Unknown'
  let color = '#999'
  if (caregiver) {
    name = caregiver.name
    color = caregiver.color
  }
  return (
    <Card className="bg-brand-2/15">
      <h2 className="font-display text-lg font-bold">
        <span style={{ color }}>{name}'s</span> Summary
      </h2>
      <p className="mb-2 text-xs text-gray-500">
        {formatDateTime(handoff.start)} – {formatDateTime(handoff.end)}
      </p>
      <BulletList bullets={handoff.summaryBullets} />
    </Card>
  )
}

/** Top of home page: AI summary of the most recent handoff. */
export function SummaryCard() {
  const { state } = useStore()
  const latest = state.handoffs[0]
  if (!latest) {
    return (
      <Card>
        <p className="text-sm text-gray-500">No handoffs yet.</p>
      </Card>
    )
  }
  return <HandoffCard handoff={latest} />
}
