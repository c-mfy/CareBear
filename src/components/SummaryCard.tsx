import { useEffect, useState } from 'react'
import { getRecentSummary } from '../lib/ai-client'
import { buildRecentContext, mockRecentSummary, recentKey, type SummaryKind, type SummaryRow } from '../lib/recent'
import { useStore } from '../lib/store'
import { useNow } from '../lib/useNow'
import { Card } from './ui'

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

const SUMMARY_CACHE_KEY = 'care-recent-summary-v2' // v2: rows instead of bullets

/** Last AI summary and the data it was based on, so a reload doesn't call the AI again. */
function cachedSummary(key: string): SummaryRow[] | null {
  try {
    const raw = localStorage.getItem(SUMMARY_CACHE_KEY)
    if (raw) {
      const cached = JSON.parse(raw) as { key: string; rows: SummaryRow[] }
      if (cached.key === key && Array.isArray(cached.rows)) {
        return cached.rows
      }
    }
  } catch {
    // no cache: ask the AI
  }
  return null
}

function cacheSummary(key: string, rows: SummaryRow[]) {
  try {
    localStorage.setItem(SUMMARY_CACHE_KEY, JSON.stringify({ key, rows }))
  } catch {
    // storage blocked: just re-ask next time
  }
}

/**
 * Top of home page: everything from the last 12 hours, across every caregiver, as a few skimmable rows
 * (icon, bold title, small detail). Shows the local rows at once and swaps in the AI ones when they arrive.
 */
export function SummaryCard() {
  const { state } = useStore()
  const now = useNow()
  const ctx = buildRecentContext(state, now)
  const key = recentKey(ctx)
  const [ai, setAi] = useState<{ key: string; rows: SummaryRow[] } | null>(() => {
    const rows = cachedSummary(key)
    if (rows) {
      return { key, rows }
    }
    return null
  })

  useEffect(() => {
    if (ai?.key === key) {
      return
    }
    const cached = cachedSummary(key)
    if (cached) {
      setAi({ key, rows: cached })
      return
    }
    let cancelled = false
    getRecentSummary(state, ctx).then((result) => {
      if (!cancelled && result.source === 'ai') {
        cacheSummary(key, result.rows)
        setAi({ key, rows: result.rows })
      }
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  let rows = mockRecentSummary(state, ctx)
  if (ai?.key === key) {
    rows = ai.rows
  }

  return (
    <Card className="px-[17px] py-1.5">
      <ul className="divide-y divide-lilac">
        {rows.map((row, i) => (
          <li key={i} className="flex items-start gap-3 py-2.5">
            <RowIcon kind={row.kind} />
            <div className="min-w-0 flex-1 pt-px">
              <p className="text-sm leading-snug font-bold">{row.title}</p>
              {row.detail && <p className="mt-0.5 text-xs leading-snug text-cocoa">{row.detail}</p>}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}

/** Colors per row kind: [tile background, icon color] */
const KIND_STYLE: Record<SummaryKind, [string, string]> = {
  missed: ['#fde3ee', '#e0699b'],
  done: ['#e1f5f4', '#1bb3b0'],
  next: ['#e1f5f4', '#1bb3b0'],
  handoff: ['#f7f5ff', '#755339'],
  quiet: ['#f7f5ff', '#755339'],
  note: ['#fde3ee', '#e0699b'],
}

/** Rounded square with a small line icon, colored by kind. */
function RowIcon({ kind }: { kind: SummaryKind }) {
  const [bg, color] = KIND_STYLE[kind]
  let path = <path d="M12 7v6M12 17h.01" /> // missed: "!"
  if (kind === 'done') {
    path = <path d="M5 12.5l4.5 4.5L19 7.5" />
  } else if (kind === 'next') {
    path = <path d="M5 12h14M13 6l6 6-6 6" />
  } else if (kind === 'handoff') {
    path = <path d="M4 8h13l-3-3M20 16H7l3 3" />
  } else if (kind === 'quiet') {
    path = <path d="M7 12h10" />
  } else if (kind === 'note') {
    path = <path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" />
  }
  return (
    <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-xl" style={{ background: bg, color }}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {path}
      </svg>
    </span>
  )
}