import { Link } from 'react-router-dom'
import { patient } from '../data/patient'
import { useStore } from '../lib/store'
import { Dot } from './ui'

/** Sticky header: patient name, who's on shift, and the check-in / hand-off action. */
export function Header({ title, back }: { title?: string; back?: boolean }) {
  const { onShift } = useStore()

  let action = (
    <Link to="/checkin" className="flex min-h-12 items-center rounded-xl bg-accent px-3 text-sm font-semibold text-ink">
      Check in
    </Link>
  )
  if (onShift) {
    action = (
      <Link to="/handoff" className="flex min-h-12 items-center rounded-xl bg-brand px-3 text-sm font-semibold text-white">
        Hand off
      </Link>
    )
  }

  let shiftLabel = <span className="text-gray-500">No one checked in</span>
  if (onShift) {
    shiftLabel = (
      <span className="flex items-center gap-1">
        <Dot color={onShift.color} /> {onShift.name} on shift
      </span>
    )
  }

  return (
    <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 px-4 py-3 backdrop-blur">
      <div className="flex items-center gap-3">
        {back && (
          <Link to="/" className="flex min-h-12 min-w-12 items-center justify-center text-2xl" aria-label="Back">
            ‹
          </Link>
        )}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-2 font-display font-bold text-white">
          {patient.nickname.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-xl font-bold">{title || patient.nickname}</h1>
          <div className="text-xs">{shiftLabel}</div>
        </div>
        {action}
      </div>
    </header>
  )
}
