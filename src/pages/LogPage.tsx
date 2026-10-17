import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { FieldInput } from '../components/FieldInput'
import { Header } from '../components/Header'
import { Button, Card, Page } from '../components/ui'
import { getDevice, patient } from '../data/patient'
import { getSuggestions } from '../lib/ai-client'
import { cx } from '../lib/cx'
import { pickSession, quarterlyDueDate } from '../lib/sessions'
import { useStore } from '../lib/store'
import type { FieldValue, Suggestion } from '../types'

/** DEVICE TAGS land here: /log/<deviceId>. Tap-to-log flow. */
export function LogPage() {
  const { deviceId = '' } = useParams()
  const [params] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { state, onShift, addLog } = useStore()
  const device = getDevice(deviceId)

  // Session: from ?session= if given, otherwise auto-picked by time of day
  const [sessionId, setSessionId] = useState(() => {
    const fromUrl = params.get('session')
    if (fromUrl) {
      return fromUrl
    }
    const fromTask = location.state?.sessionId
    if (typeof fromTask === 'string') {
      return fromTask
    }
    if (device) {
      return pickSession(device).id
    }
    return ''
  })
  const [values, setValues] = useState<Record<string, FieldValue>>({})
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)

  const session = device?.sessions.find((s) => s.id === sessionId)

  // Reset the form and fetch AI suggestions whenever the session changes
  useEffect(() => {
    if (!device || !session) {
      return
    }
    setValues({})
    setSuggestions([])
    setLoadingSuggestions(true)
    const recent = state.logs
      .filter((l) => l.deviceId === device.id && l.sessionId === session.id)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    let cancelled = false
    getSuggestions(device, session, recent).then((list) => {
      if (!cancelled) {
        setSuggestions(list)
        setLoadingSuggestions(false)
      }
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId, sessionId])

  if (!device) {
    return (
      <Page>
        <Header title="Unknown tag" back />
        <p className="p-4">This tag isn't linked to a device.</p>
      </Page>
    )
  }

  // Must be checked in to log
  if (!onShift) {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/checkin?next=${next}`} replace />
  }

  function handleComplete() {
    if (!device || !session) {
      return
    }
    addLog(device.id, session.id, values)
    navigate('/')
  }

  return (
    <Page>
      <Header title={device.name} back />
      <main className="space-y-4 px-4 pt-4">
        <p className="text-sm text-gray-500">{device.model}</p>

        {/* Session picker (auto-selected, can change) */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {device.sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => setSessionId(s.id)}
              className={cx(
                'min-h-12 shrink-0 rounded-full px-4 text-sm font-semibold',
                s.id === sessionId && 'bg-brand text-white',
                s.id !== sessionId && 'bg-white text-ink shadow-sm',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        {session?.recurrence === 'quarterly' && (
          <p className="text-sm text-gray-600">
            Due by {quarterlyDueDate(patient.lastGtubeButtonChange).toLocaleDateString()}
          </p>
        )}

        {session && (
          <Card className="space-y-3">
            {/* AI suggested options: tap one to fill the form */}
            <div className="flex flex-wrap gap-2">
              {loadingSuggestions && <span className="text-xs text-gray-400">Loading suggestions…</span>}
              {suggestions.map((s) => (
                <button
                  key={s.label}
                  onClick={() => setValues({ ...s.values })}
                  className="min-h-10 rounded-full border-2 border-brand-2 px-3 text-xs font-semibold"
                >
                  {s.label}
                </button>
              ))}
            </div>

            {session.fields.map((f) => (
              <FieldInput
                key={f.id}
                field={f}
                value={values[f.id]}
                onChange={(v) => setValues((prev) => ({ ...prev, [f.id]: v }))}
              />
            ))}

            <Button onClick={handleComplete}>Mark as complete</Button>
            <p className="text-center text-xs text-gray-500">Logging as {onShift.name}</p>
          </Card>
        )}
      </main>
    </Page>
  )
}
