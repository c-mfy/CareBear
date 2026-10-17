import { formatDateTime } from '../lib/format'
import { useCaregiver, useStore } from '../lib/store'
import type { Handoff } from '../types'
import { Card, Tag } from './ui'

export function BulletList({ bullets }: { bullets: string[] }) {
  return (
    <ul className="space-y-1.5 text-[13px] leading-snug">
      {bullets.map((b, i) => (
        <li key={i} className="flex gap-2">
          <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
          <span>{b}</span>
        </li>
      ))}
    </ul>
  )
}

function HandoffCard({ handoff }: { handoff: Handoff }) {
  const caregiver = useCaregiver(handoff.caregiverId)
  let name = 'Unknown'
  if (caregiver) {
    name = caregiver.name
  }
  return (
    <Card className="border-l-[5px] border-teal">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold">{name}'s summary</h2>
        <Tag className="bg-mist text-teal">✦ AI summary</Tag>
      </div>
      <p className="mb-2 text-xs text-cocoa">
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
        <p className="text-sm text-cocoa">No handoffs yet.</p>
      </Card>
    )
  }
  return <HandoffCard handoff={latest} />
}
