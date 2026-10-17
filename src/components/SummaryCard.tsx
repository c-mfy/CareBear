import { useEffect, useState } from 'react'
import { getRecentSummary } from '../lib/ai-client'
import { cx } from '../lib/cx'
import { formatDateTime } from '../lib/format'
import { buildRecentContext, mockRecentSummary, RECENT_HOURS, recentKey } from '../lib/recent'
import { useStore } from '../lib/store'
import { useNow } from '../lib/useNow'
import type { Caregiver } from '../types'
import { Card, Dot, FlagMark, Tag } from './ui'

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

const SUMMARY_CACHE_KEY = 'care-recent-summary-v1'

/** Last AI summary and the data it was based on, so a reload doesn't call the AI again. */
function cachedSummary(key: string): string[] | null {
  try {
    const raw = localStorage.getItem(SUMMARY_CACHE_KEY)
    if (raw) {
      const cached = JSON.parse(raw) as { key: string; bullets: string[] }
      if (cached.key === key) {
        return cached.bullets
      }
    }
  } catch {
    // no cache: ask the AI
  }
  return null
}

function cacheSummary(key: string, bullets: string[]) {
  try {
    localStorage.setItem(SUMMARY_CACHE_KEY, JSON.stringify({ key, bullets }))
  } catch {
    // storage blocked: just re-ask next time
  }
}

/**
 * Top of home page: everything from the last 12 hours, across every caregiver, condensed.
 * Shows the local summary at once and swaps in the AI one when it arrives.
 */
export function SummaryCard() {
  const { state } = useStore()
  const now = useNow()
  const ctx = buildRecentContext(state, now)
  const key = recentKey(ctx)
  const [ai, setAi] = useState<{ key: string; bullets: string[] } | null>(() => {
    const bullets = cachedSummary(key)
    return bullets ? { key, bullets } : null
  })

  useEffect(() => {
    if (ai?.key === key) {
      return
    }
    const cached = cachedSummary(key)
    if (cached) {
      setAi({ key, bullets: cached })
      return
    }
    let cancelled = false
    getRecentSummary(state, ctx).then((result) => {
      if (!cancelled && result.source === 'ai') {
        cacheSummary(key, result.bullets)
        setAi({ key, bullets: result.bullets })
      }
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const fromAi = ai?.key === key
  const bullets = fromAi ? ai.bullets : mockRecentSummary(state, ctx)
  const needsAttention = ctx.overdue.length > 0 || ctx.handoffs.some((h) => h.flagged)
  const people = ctx.caregiverIds
    .map((id) => state.caregivers.find((c) => c.id === id))
    .filter((c): c is Caregiver => !!c)

  return (
    <Card className={cx('border-l-[5px]', needsAttention ? 'border-rose' : 'border-teal')}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-bold">
          {needsAttention && <FlagMark />}
          Last {RECENT_HOURS} hours
        </h2>
        {fromAi ? (
          <Tag className="bg-mist text-teal">✦ AI summary</Tag>
        ) : (
          <Tag className="bg-lilac text-cocoa">Auto summary</Tag>
        )}
      </div>
      <p className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-cocoa">
        <span>{formatDateTime(ctx.since.toISOString())} – now</span>
        {people.map((c) => (
          <span key={c.id} className="flex items-center gap-1">
            <Dot color={c.color} /> {c.name}
          </span>
        ))}
      </p>
      <BulletList bullets={bullets} />
    </Card>
  )
}
