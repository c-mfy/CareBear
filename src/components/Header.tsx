import { Link } from 'react-router-dom'
import { formatTime } from '../lib/format'
import { useStore } from '../lib/store'
import { BackIcon } from './icons'
import { Dot, Tag } from './ui'

/** Who's on shift, as a small pill. */
export function ShiftTag() {
  const { state, onShift } = useStore()
  if (!onShift || !state.currentShift) {
    return <Tag className="bg-white text-cocoa">No one checked in</Tag>
  }
  return (
    <Tag className="bg-mist text-brown">
      <Dot color={onShift.color} />
      {onShift.name} · on shift since {formatTime(state.currentShift.start)}
    </Tag>
  )
}

/**
 * Sticky top bar.
 * - Home (no title): just the on-shift pill.
 * - Inner pages: round back button + centered title.
 */
export function Header({ title, back }: { title?: string; back?: boolean }) {
  if (!back) {
    return (
      <header className="sticky top-0 z-20 bg-lilac/90 px-4 pt-4 pb-2 backdrop-blur">
        <ShiftTag />
      </header>
    )
  }
  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 px-4 pt-4 pb-2 backdrop-blur">
      <Link
        to="/"
        aria-label="Back"
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white"
      >
        <BackIcon />
      </Link>
      <h1 className="flex-1 truncate text-center text-[15px] font-semibold">{title}</h1>
      <span className="w-12 shrink-0" />
    </header>
  )
}
