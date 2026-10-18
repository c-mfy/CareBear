import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDateTime } from '../lib/format'
import { useStore } from '../lib/store'
import { BulletList } from './SummaryCard'
import { Dot, FlagMark } from './ui'

/**
 * Patient history: previous handoff summaries, newest first. Tap one to expand it.
 * limit: show only the newest few, with a link to the full history page.
 */
export function HistoryList({ limit }: { limit?: number }) {
  const { state, deleteHandoff } = useStore()
  const [openId, setOpenId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const handoffs = limit ? state.handoffs.slice(0, limit) : state.handoffs
  const hidden = state.handoffs.length - handoffs.length

  function toggle(id: string) {
    setConfirmDeleteId(null)
    if (openId === id) {
      setOpenId(null)
    } else {
      setOpenId(id)
    }
  }

  return (
    <div className="space-y-2">
      {handoffs.map((h) => {
        const caregiver = state.caregivers.find((c) => c.id === h.caregiverId)
        let name = 'Unknown'
        let color = '#755339'
        if (caregiver) {
          name = caregiver.name
          color = caregiver.color
        }
        let chevron = '›'
        if (openId === h.id) {
          chevron = '⌄'
        }
        return (
          <div key={h.id} className="rounded-[18px] bg-white">
            <button
              onClick={() => toggle(h.id)}
              className="flex min-h-12 w-full items-center gap-2.5 px-4 py-3 text-left"
            >
              <Dot color={color} />
              <span className="flex flex-1 items-center gap-1.5 text-sm font-semibold">
                {name}
                {h.flagged && <FlagMark />}
              </span>
              <span className="text-xs text-cocoa">
                {formatDateTime(h.start)} – {formatDateTime(h.end)}
              </span>
              <span className="w-3 text-center text-cocoa">{chevron}</span>
            </button>
            {openId === h.id && (
              <div className="border-t border-lilac px-4 py-3">
                {h.flagged && (
                  <div className="mb-2 text-xs text-rose">
                    <p className="font-semibold">
                      {h.flagReasons?.length ? 'Flagged: overdue this shift' : `Flagged as abnormal by ${name}`}
                    </p>
                    {h.flagReasons?.map((r) => (
                      <p key={r}>• {r}</p>
                    ))}
                  </div>
                )}
                <BulletList bullets={h.summaryBullets} />
                {confirmDeleteId !== h.id && (
                  <button
                    onClick={() => setConfirmDeleteId(h.id)}
                    className="mt-3 min-h-9 text-xs font-semibold text-rose underline"
                  >
                    Delete this visit
                  </button>
                )}
                {confirmDeleteId === h.id && (
                  <div className="mt-3 rounded-xl bg-lilac px-3 py-2.5 text-sm">
                    <p>
                      Delete {name}'s visit and the {h.logIds.length} {h.logIds.length === 1 ? 'entry' : 'entries'} logged
                      during it? This can't be undone.
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => {
                          deleteHandoff(h.id)
                          setConfirmDeleteId(null)
                          setOpenId(null)
                        }}
                        className="min-h-10 flex-1 rounded-full bg-rose font-semibold text-white"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="min-h-10 flex-1 rounded-full border-[1.5px] border-aqua bg-white font-semibold"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
      {hidden > 0 && (
        <Link
          to="/history"
          className="flex min-h-11 w-full items-center justify-center rounded-[18px] text-sm font-semibold text-teal active:bg-white"
        >
          Show all ({hidden} more) ›
        </Link>
      )}
    </div>
  )
}
