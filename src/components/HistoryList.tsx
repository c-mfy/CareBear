import { useState } from 'react'
import { formatDateTime } from '../lib/format'
import { useStore } from '../lib/store'
import { BulletList } from './SummaryCard'
import { Card, Dot } from './ui'

/** Patient history: previous handoff summaries. Tap one to expand it. */
export function HistoryList() {
  const { state } = useStore()
  const [openId, setOpenId] = useState<string | null>(null)

  function toggle(id: string) {
    if (openId === id) {
      setOpenId(null)
    } else {
      setOpenId(id)
    }
  }

  return (
    <div className="space-y-2">
      {state.handoffs.map((h) => {
        const caregiver = state.caregivers.find((c) => c.id === h.caregiverId)
        let name = 'Unknown'
        let color = '#999'
        if (caregiver) {
          name = caregiver.name
          color = caregiver.color
        }
        return (
          <Card key={h.id} className="p-0">
            <button onClick={() => toggle(h.id)} className="flex min-h-12 w-full items-center gap-2 px-4 py-3 text-left">
              <Dot color={color} />
              <span className="flex-1 text-sm font-semibold">{name}</span>
              <span className="text-xs text-gray-500">
                {formatDateTime(h.start)} – {formatDateTime(h.end)}
              </span>
            </button>
            {openId === h.id && (
              <div className="border-t border-gray-100 px-4 py-3">
                <BulletList bullets={h.summaryBullets} />
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}
