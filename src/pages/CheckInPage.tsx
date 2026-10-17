import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CaregiverPicker } from '../components/CaregiverPicker'
import { Header } from '../components/Header'
import { Card, Page } from '../components/ui'
import { useStore } from '../lib/store'
import type { Caregiver } from '../types'

/** DOOR TAG lands here: /checkin. Also used when someone taps a device tag before checking in. */
export function CheckInPage() {
  const { onShift, checkIn } = useStore()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next') || '/'

  function handlePick(c: Caregiver) {
    checkIn(c.id)
    navigate(next)
  }

  if (onShift) {
    return (
      <Page>
        <Header title="Check in" back />
        <main className="px-4 pt-4">
          <Card className="space-y-3">
            <p>
              <b>{onShift.name}</b> is still on shift. They need to hand off before someone else checks in.
            </p>
            <Link to="/handoff" className="flex min-h-12 items-center justify-center rounded-xl bg-brand font-semibold text-white">
              Go to handoff
            </Link>
            <Link to={next} className="flex min-h-12 items-center justify-center rounded-xl border border-gray-300 font-semibold">
              Continue as {onShift.name}
            </Link>
          </Card>
        </main>
      </Page>
    )
  }

  return (
    <Page>
      <Header title="Check in" back />
      <main className="px-4 pt-4">
        <h2 className="mb-3 font-display text-lg font-bold">Who's logging?</h2>
        <CaregiverPicker onPick={handlePick} />
      </main>
    </Page>
  )
}
