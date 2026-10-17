import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CaregiverPicker } from '../components/CaregiverPicker'
import { Header } from '../components/Header'
import { Card, Page } from '../components/ui'
import { DOOR_TAG_ID } from '../data/patient'
import { useStore } from '../lib/store'
import type { Caregiver } from '../types'

/**
 * DOOR TAG lands here: /checkin?tag=<DOOR_TAG_ID>.
 * EVV: a shift can only start from the door tag, which proves the caregiver is at the home.
 * Opening /checkin any other way (a link, a device tag before check-in) shows "tap the door tag".
 */
export function CheckInPage() {
  const { onShift, checkIn } = useStore()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next') || '/'
  const tagId = params.get('tag')
  const tagValid = tagId === DOOR_TAG_ID

  function handlePick(c: Caregiver) {
    if (!tagValid) {
      return
    }
    checkIn(c.id, DOOR_TAG_ID)
    // replace: keep the tag id out of the back history
    navigate(next, { replace: true })
  }

  if (onShift) {
    return (
      <Page>
        <Header title="Check in" back />
        <main className="px-4 pt-3">
          <Card className="space-y-3">
            <p className="text-sm">
              <b>{onShift.name}</b> is still on shift. They need to hand off before someone else checks in.
            </p>
            <Link to="/handoff" className="flex min-h-12 items-center justify-center rounded-full bg-teal font-semibold text-white">
              Go to handoff
            </Link>
            <Link
              to={next}
              className="flex min-h-12 items-center justify-center rounded-full border-[1.5px] border-aqua font-semibold"
            >
              Continue as {onShift.name}
            </Link>
          </Card>
        </main>
      </Page>
    )
  }

  if (!tagValid) {
    return (
      <Page>
        <Header title="Check in" back />
        <main className="px-4 pt-3">
          <Card className="space-y-2 text-center">
            <div className="text-4xl">📲</div>
            <h2 className="text-xl font-bold">Tap the door tag to check in</h2>
            <p className="text-sm text-cocoa">
              Shifts can only start from the NFC tag by the front door. This verifies you're at the home
              (EVV).
            </p>
            {params.get('next') && (
              <p className="text-sm text-cocoa">After you check in, tap the device tag again to log it.</p>
            )}
          </Card>
        </main>
      </Page>
    )
  }

  return (
    <Page>
      <Header title="Check in" back />
      <main className="px-4 pt-3">
        <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-mist px-3 py-1 text-xs font-semibold text-teal">
          ✓ Door tag verified
        </p>
        <h2 className="text-2xl font-bold">Who's logging?</h2>
        <p className="mb-4 text-sm text-cocoa">Pick your name to start your shift.</p>
        <CaregiverPicker onPick={handlePick} />
      </main>
    </Page>
  )
}
