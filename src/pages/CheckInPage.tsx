import { useState, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { CaregiverPicker } from '../components/CaregiverPicker'
import { Kuma } from '../components/Kuma'
import { DOOR_TAG_ID } from '../data/patient'
import { useStore } from '../lib/store'
import type { Caregiver } from '../types'

/**
 * Figma check-in layout: a centered white card with waving Kuma peeking over its top-left corner,
 * and "CareBearHealth" at the bottom of the screen.
 */
function CheckInShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-[25px]">
      <main className="flex flex-1 items-center py-10">
        <div className="relative mt-[76px] w-full rounded-[22px] bg-white px-[19px] pt-4 pb-4 text-center">
          <Kuma mood="wave" className="absolute -top-[76px] left-0" />
          {children}
        </div>
      </main>
      <footer className="pb-8 text-center text-base">CareBearHealth</footer>
    </div>
  )
}

function Title({ children }: { children: ReactNode }) {
  return <h1 className="font-display text-lg font-bold">{children}</h1>
}

/**
 * DOOR TAG lands here: /checkin?tag=<DOOR_TAG_ID>.
 * EVV: a shift can only start from the door tag, which proves the caregiver is at the home.
 * Opening /checkin any other way (a link, a device tag before check-in) shows "tap the door tag".
 * The same tag checks out: tapped while someone is on shift, it opens their (verified) handoff.
 */
export function CheckInPage() {
  const { onShift, checkIn } = useStore()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next') || '/'
  const tagId = params.get('tag')
  const tagValid = tagId === DOOR_TAG_ID
  // Was someone on shift when the tag was tapped? Only then is this tap a check-out.
  // (Checked once on arrival: right after picking a name, onShift is set before we navigate away.)
  const [tappedToCheckOut] = useState(() => !!onShift && tagValid)

  function handlePick(c: Caregiver) {
    if (!tagValid) {
      return
    }
    checkIn(c.id, DOOR_TAG_ID)
    // replace: keep the tag id out of the back history
    navigate(next, { replace: true })
  }

  if (tappedToCheckOut) {
    return <Navigate to={`/handoff?tag=${DOOR_TAG_ID}`} replace />
  }

  if (onShift) {
    return (
      <CheckInShell>
        <Title>Check In</Title>
        <p className="mt-3 text-base">
          <b>{onShift.name}</b> is still on shift. They need to hand off and tap Kuma to check out before
          someone else checks in.
        </p>
        <div className="mt-4 space-y-2">
          <Link to="/handoff" className="flex min-h-12 items-center justify-center rounded-full bg-cocoa font-display font-bold text-white">
            Go to handoff
          </Link>
          <Link
            to={next}
            className="flex min-h-12 items-center justify-center rounded-full border-[1.5px] border-blush font-display font-bold"
          >
            Continue as {onShift.name}
          </Link>
        </div>
      </CheckInShell>
    )
  }

  if (!tagValid) {
    return (
      <CheckInShell>
        <Title>Check In</Title>
        <p className="mt-3 text-base">
          Tap your phone on Kuma to check in! CareBear uses EVV to make sure you’re a verified caretaker.
        </p>
        <p className="mt-5 text-base">After you check in, tap a device tag to log it.</p>
      </CheckInShell>
    )
  }

  return (
    <CheckInShell>
      <Title>Check In</Title>
      <p className="mt-1 text-sm font-bold text-sea">✓ Kuma tapped, you’re at the home</p>
      <p className="mt-3 mb-4 text-base">Who’s logging? Pick your name to start your shift.</p>
      <div className="text-left">
        <CaregiverPicker onPick={handlePick} />
      </div>
    </CheckInShell>
  )
}
