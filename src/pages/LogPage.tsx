import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { FieldInput } from '../components/FieldInput'
import { Header } from '../components/Header'
import { BottomBar, Page } from '../components/ui'
import { DeviceIcon } from '../components/icons'
import { getDevice, patient } from '../data/patient'
import { getSuggestions } from '../lib/ai-client'
import { cx } from '../lib/cx'
import { pickSession, quarterlyDueDate } from '../lib/sessions'
import { findDoseConflict, type DoseConflict } from '../lib/dose-check'
import { describeLog, formatMinutes, formatScheduled, formatTime } from '../lib/format'
import { useStore } from '../lib/store'
import { buildTodayTasks } from '../lib/tasks'
import { showCelebration } from '../lib/welcome'
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
  // Medication only: caregiver confirmed this is a separate dose despite the warning
  const [repeatConfirmed, setRepeatConfirmed] = useState(false)

  const session = device?.sessions.find((s) => s.id === sessionId)

  // Reset the form and fetch AI suggestions whenever the session changes
  useEffect(() => {
    if (!device || !session) {
      return
    }
    setValues({})
    setSuggestions([])
    setRepeatConfirmed(false)
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
        <p className="p-4 text-sm">This tag isn't linked to a device.</p>
      </Page>
    )
  }

  // Must be checked in to log
  if (!onShift) {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/checkin?next=${next}`} replace />
  }

  const conflict = device && session ? findDoseConflict(device, session, state.logs) : null
  const blocked = !!conflict && !!device.medication && !repeatConfirmed

  function handleComplete() {
    if (!device || !session || blocked) {
      return
    }
    addLog(device.id, session.id, values)
    celebrate(device.id, device.name, session.id)
    navigate('/')
  }

  /** Kuma's "done!" scene: what was logged, when, and today's progress including this entry. */
  function celebrate(logDeviceId: string, deviceName: string, logSessionId: string) {
    const now = new Date()
    const justLogged = {
      id: 'just-logged',
      deviceId: logDeviceId,
      sessionId: logSessionId,
      caregiverId: '',
      timestamp: now.toISOString(),
      values: {},
    }
    const tasks = buildTodayTasks([...state.logs, justLogged], now)
    const doneCount = tasks.filter((t) => t.done).length
    if (tasks.length > 0 && doneCount === tasks.length) {
      showCelebration({ title: 'All done for today!', subtitle: 'Kuma is so proud of you.' })
      return
    }
    showCelebration({
      title: `${deviceName} done!`,
      subtitle: `Logged at ${formatTime(now.toISOString())} · ${doneCount} of ${tasks.length} today`,
    })
  }

  let scheduled = ''
  if (session?.scheduledTime) {
    scheduled = `Scheduled ${formatScheduled(session.scheduledTime)}`
  }

  return (
    <Page className="bg-mist" bottomBar>
      <Header title="Log care" back />
      <main className="px-4 pt-2">
        {/* Device header */}
        <div className="flex items-center gap-3">
          <span className="rounded-2xl bg-white p-1.5">
            <DeviceIcon deviceId={device.id} size={44} />
          </span>
          <div className="min-w-0">
            <h1 className="text-[26px] leading-tight font-bold">{device.name}</h1>
            <p className="text-xs text-cocoa">{device.model}</p>
          </div>
        </div>

        {/* Session picker (auto-selected, can change) */}
        <div className="mt-4 flex gap-1 overflow-x-auto rounded-2xl bg-white p-1">
          {device.sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => setSessionId(s.id)}
              className={cx(
                'min-h-11 flex-1 shrink-0 rounded-xl px-3 text-[13px] font-semibold whitespace-nowrap',
                s.id === sessionId && 'bg-teal text-white',
                s.id !== sessionId && 'text-cocoa',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="mt-2 flex justify-between px-0.5 text-xs text-cocoa">
          <span>{scheduled}</span>
          <span>
            Logging as <b className="text-brown">{onShift.name}</b>
          </span>
        </div>

        {conflict && (
          <DoseWarning
            conflict={conflict}
            medication={!!device.medication}
            confirmed={repeatConfirmed}
            onConfirm={() => setRepeatConfirmed(true)}
          />
        )}

        {session?.recurrence === 'quarterly' && (
          <p className="mt-2 text-xs text-cocoa">
            Due by {quarterlyDueDate(patient.lastGtubeButtonChange).toLocaleDateString()}
          </p>
        )}

        {session && (
          <>
            {/* AI suggested options: tap one to fill the form */}
            <p className="mt-4 text-[11px] font-bold tracking-wider text-teal uppercase">
              ✦ Quick fill · based on recent logs
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {loadingSuggestions && <span className="text-xs text-sea">Loading suggestions…</span>}
              {suggestions.map((s) => (
                <button
                  key={s.label}
                  onClick={() => setValues({ ...s.values })}
                  className="min-h-9 rounded-full border-[1.5px] border-aqua bg-white px-3.5 text-xs font-semibold active:bg-teal active:text-white"
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div className="mt-3 space-y-2">
              {session.fields.map((f) => (
                <FieldInput
                  key={f.id}
                  field={f}
                  value={values[f.id]}
                  onChange={(v) => setValues((prev) => ({ ...prev, [f.id]: v }))}
                />
              ))}
            </div>
          </>
        )}
      </main>

      {session && (
        <BottomBar className={cx('p-0 pl-0', blocked ? 'bg-rose' : 'bg-teal')}>
          <button onClick={handleComplete} disabled={blocked} className="min-h-14 w-full rounded-full text-[15px]">
            {blocked ? 'Check the dose warning above' : `Mark as complete · ${formatTime(new Date().toISOString())}`}
          </button>
        </BottomBar>
      )}
    </Page>
  )
}

/** Shown when this was already logged. Medication blocks logging until the caregiver confirms. */
function DoseWarning({
  conflict,
  medication,
  confirmed,
  onConfirm,
}: {
  conflict: DoseConflict
  medication: boolean
  confirmed: boolean
  onConfirm: () => void
}) {
  const { state } = useStore()
  const { log, reason } = conflict
  const device = getDevice(log.deviceId)
  const session = device?.sessions.find((s) => s.id === log.sessionId)
  const who = state.caregivers.find((c) => c.id === log.caregiverId)?.name || 'Unknown'
  const ago = formatMinutes(Math.max(0, Math.floor((Date.now() - new Date(log.timestamp).getTime()) / 60000)))
  const when = `${formatTime(log.timestamp)} by ${who} (${ago} ago)`

  let title = 'Already logged today'
  if (medication && reason === 'same-session') {
    title = `${session?.label || 'Dose'} already given`
  } else if (medication) {
    title = 'A dose was given recently'
  }

  return (
    <div
      role="alert"
      className={cx('mt-3 rounded-2xl px-4 py-3', medication ? 'bg-rose text-white' : 'border-[1.5px] border-rose bg-white')}
    >
      <p className="text-[15px] font-bold">⚠ {title}</p>
      <p className="mt-0.5 text-sm">
        {session?.label} · {when}
      </p>
      <p className={cx('mt-1 text-xs', !medication && 'text-cocoa')}>{describeLog(log)}</p>
      {medication && !confirmed && (
        <button
          onClick={onConfirm}
          className="mt-3 min-h-11 w-full rounded-full bg-white px-4 text-sm font-semibold text-rose"
        >
          This is a separate dose — log anyway
        </button>
      )}
      {medication && confirmed && (
        <p className="mt-2 text-xs font-semibold">Confirmed as a separate dose. It will be logged as normal.</p>
      )}
    </div>
  )
}
