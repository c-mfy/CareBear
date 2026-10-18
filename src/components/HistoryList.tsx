import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDateTime } from '../lib/format'
import { useStore } from '../lib/store'
import { BulletList } from './SummaryCard'
import { FlagMark } from './ui'

/**
 * Care history (Figma layout): a plain list with pink dividers, no card.
 * Previous handoff summaries, newest first. Tap one to expand it.
 * limit: show only the newest few, with a link to the full history page.
 */
export function HistoryList({ limit }: { limit?: number }) {
  const { state, deleteHandoff } = useStore()
  const [openId, setOpenId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  let handoffs = state.handoffs
  if (limit) {
    handoffs = state.handoffs.slice(0, limit)
  }
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
    <div className="mx-[17px]">
      <ul className="border-t border-blush">
        {handoffs.map((h) => {
          const caregiver = state.caregivers.find((c) => c.id === h.caregiverId)
          let name = 'Unknown'
          if (caregiver) {
            name = caregiver.name
          }
          let chevron = '›'
          if (openId === h.id) {
            chevron = '⌄'
          }
          let entries = 'entries'
          if (h.logIds.length === 1) {
            entries = 'entry'
          }
          let flagTitle = `Flagged as abnormal by ${name}`
          if (h.flagReasons && h.flagReasons.length > 0) {
            flagTitle = 'Flagged: overdue this shift'
          }
          return (
            <li key={h.id} className="border-b border-blush">
              <button onClick={() => toggle(h.id)} className="flex min-h-9 w-full items-center gap-2 pr-2 pl-[9px] text-left">
                <span className="flex flex-1 items-center gap-1.5 font-display text-base font-bold">
                  {name}
                  {h.flagged && <FlagMark />}
                </span>
                <span className="text-xs font-light whitespace-nowrap uppercase">
                  {formatDateTime(h.start)} – {formatDateTime(h.end)}
                </span>
                <span className="w-3 text-center text-base">{chevron}</span>
              </button>
              {openId === h.id && (
                <div className="pr-2 pb-3 pl-[9px]">
                  {h.flagged && (
                    <div className="mb-2 text-xs text-rose">
                      <p className="font-bold">{flagTitle}</p>
                      {h.flagReasons?.map((r) => (
                        <p key={r}>• {r}</p>
                      ))}
                    </div>
                  )}
                  <BulletList bullets={h.summaryBullets} />
                  {confirmDeleteId !== h.id && (
                    <button
                      onClick={() => setConfirmDeleteId(h.id)}
                      className="mt-3 min-h-9 text-xs font-bold text-rose underline"
                    >
                      Delete this visit
                    </button>
                  )}
                  {confirmDeleteId === h.id && (
                    <div className="mt-3 rounded-xl bg-white px-3 py-2.5 text-sm">
                      <p>
                        Delete {name}'s visit and the {h.logIds.length} {entries} logged during it? This can't be
                        undone.
                      </p>
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => {
                            deleteHandoff(h.id)
                            setConfirmDeleteId(null)
                            setOpenId(null)
                          }}
                          className="min-h-10 flex-1 rounded-full bg-rose font-bold text-white"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="min-h-10 flex-1 rounded-full border-[1.5px] border-aqua bg-white font-bold"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
      {hidden > 0 && (
        <Link to="/history" className="flex min-h-10 w-full items-center justify-end text-xs font-black text-sea">
          Show all ({hidden} more) &gt;
        </Link>
      )}
    </div>
  )
}
