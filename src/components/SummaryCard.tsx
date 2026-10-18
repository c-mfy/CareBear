import { useEffect, useState } from 'react'
import { getRecentSummary } from '../lib/ai-client'
import { buildRecentContext, mockRecentSummary, RECENT_HOURS, recentKey } from '../lib/recent'
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
    if (bullets) {
      return { key, bullets }
    }
    return null
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

  let bullets = mockRecentSummary(state, ctx)
  if (ai?.key === key) {
    bullets = ai.bullets
  }

  return (
    <Card className="px-[17px] pt-[17px] pb-[18px]">
      <h3 className="mb-3 pl-[5px] text-base font-bold">Last {RECENT_HOURS} hours</h3>
      <ul className="list-disc space-y-0.5 pl-[18px] text-xs leading-snug">
        {bullets.map((b, i) => (
          <li key={i}>
            <SummaryLine text={b} />
          </li>
        ))}
      </ul>
    </Card>
  )
}

/** Bold a leading "Next up:" label, as in the Figma. */
function SummaryLine({ text }: { text: string }) {
  const label = 'Next up:'
  if (text.startsWith(label)) {
    return (
      <>
        <b>{label}</b>
        {text.slice(label.length)}
      </>
    )
  }
  return <>{text}</>
}
