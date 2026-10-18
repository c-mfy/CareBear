import { Link } from 'react-router-dom'
import { formatTime } from '../lib/format'
import { useStore } from '../lib/store'
import { BackIcon, ChevronIcon, DocIcon, PhoneIcon } from './icons'
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
 * - Home (no title): pink EMERGENCY pill and white Doctor's Note row, right-aligned.
 * - Inner pages: round back button + centered title.
 */
export function Header({ title, back }: { title?: string; back?: boolean }) {
  if (!back) {
    return (
      <header className="sticky top-0 z-20 flex justify-end bg-blossom/90 px-[25px] pt-4 pb-2 backdrop-blur">
        <nav className="flex w-[172px] flex-col gap-2">
          <Link
            to="/emergency"
            className="flex min-h-10 items-center justify-center gap-[7px] rounded-full bg-rose px-3.5 text-sm font-black tracking-[0.06em] text-white shadow-[0_3px_0_#e07aa3] active:translate-y-[2px] active:shadow-[0_1px_0_#e07aa3]"
          >
            <PhoneIcon />
            EMERGENCY
          </Link>
          <Link
            to="/doctor-note"
            className="flex min-h-9 items-center gap-2 rounded-2xl bg-white py-1.5 pr-3 pl-[7px] text-sm font-bold active:scale-[0.98]"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-mist text-sea">
              <DocIcon />
            </span>
            <span className="flex-1">Doctor’s Note</span>
            <span className="text-sea">
              <ChevronIcon />
            </span>
          </Link>
        </nav>
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