import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { devices, getDevice } from '../data/patient'
import { describeLog, formatDateTime, formatMinutes, formatTime, logNotes } from '../lib/format'
import { isSameDay, timeToday } from '../lib/sessions'
import { useStore } from '../lib/store'
import { OVERDUE_GRACE_MINUTES } from '../lib/tasks'
import type { LogEntry } from '../types'
import { Card, Dot } from './ui'

const EVENT_MINUTES = 30 // a log is a point in time; draw it as a 30-min block
const FIRST_HOUR = 5
const PLANNED_PREFIX = 'planned:'
const PLANNED_GRAY = '#e9e6ee'

interface PlannedTask {
  id: string
  deviceId: string
  sessionId: string
  title: string
  label: string
  scheduled: Date
}

/** Daily sessions not logged yet, from today through `end` (past days only show what was logged). */
function plannedTasks(logs: LogEntry[], end: Date, now: Date): PlannedTask[] {
  const tasks: PlannedTask[] = []
  const day = new Date(now)
  day.setHours(0, 0, 0, 0)
  for (; day < end; day.setDate(day.getDate() + 1)) {
    for (const device of devices) {
      for (const session of device.sessions) {
        if (session.recurrence !== 'daily' || !session.scheduledTime) {
          continue
        }
        const done = logs.some(
          (l) => l.deviceId === device.id && l.sessionId === session.id && isSameDay(new Date(l.timestamp), day),
        )
        if (done) {
          continue
        }
        const scheduled = timeToday(session.scheduledTime, day)
        tasks.push({
          id: `${PLANNED_PREFIX}${device.id}:${session.id}:${scheduled.getTime()}`,
          deviceId: device.id,
          sessionId: session.id,
          title: device.name,
          label: session.label,
          scheduled,
        })
      }
    }
  }
  return tasks
}

function hourTime(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00:00`
}

/** Scroll so the current hour sits near the top, with an hour of context above it. */
function currentScrollTime(): string {
  return hourTime(Math.max(FIRST_HOUR, new Date().getHours() - 1))
}

/**
 * Week view of everything logged, colored by the caregiver who logged it, plus today's and upcoming
 * sessions that aren't done yet in gray. Tap an entry for details.
 */
export function CareCalendar() {
  const { state } = useStore()
  const [scrollTime] = useState(currentScrollTime)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  // End of the week on screen, so gray tasks are drawn for future weeks too
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null)
  const now = new Date()
  const weekAhead = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7)
  const planned = plannedTasks(state.logs, rangeEnd || weekAhead, now)

  const events = state.logs.map((log) => {
    const caregiver = state.caregivers.find((c) => c.id === log.caregiverId)
    let color = '#755339'
    if (caregiver) {
      color = caregiver.color
    }
    const start = new Date(log.timestamp)
    const end = new Date(start.getTime() + EVENT_MINUTES * 60 * 1000)
    return {
      id: log.id,
      title: getDevice(log.deviceId)?.name || log.deviceId,
      start,
      end,
      backgroundColor: color,
      borderColor: color,
      textColor: '#ffffff',
      classNames: [] as string[],
    }
  })
  for (const task of planned) {
    events.push({
      id: task.id,
      title: task.title,
      start: task.scheduled,
      end: new Date(task.scheduled.getTime() + EVENT_MINUTES * 60 * 1000),
      backgroundColor: PLANNED_GRAY,
      borderColor: '#cfc9d8',
      textColor: '#6f6875',
      classNames: ['fc-planned'],
    })
  }

  const selected = state.logs.find((l) => l.id === selectedId)
  const selectedTask = planned.find((t) => t.id === selectedId)

  return (
    <Card className="p-3">
      <div className="mb-2 flex flex-wrap gap-3 px-1 text-xs font-medium text-cocoa">
        {state.caregivers.filter((c) => !c.removed || state.logs.some((l) => l.caregiverId === c.id)).map((c) => (
          <span key={c.id} className="flex items-center gap-1">
            <Dot color={c.color} /> {c.name}
          </span>
        ))}
        <span className="flex items-center gap-1">
          <Dot color="#cfc9d8" /> Not done yet
        </span>
      </div>
      <FullCalendar
        plugins={[timeGridPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{ left: 'prev', center: 'title', right: 'next' }}
        dayHeaderFormat={{ weekday: 'narrow', day: 'numeric' }}
        allDaySlot={false}
        slotMinTime={hourTime(FIRST_HOUR)}
        slotMaxTime="24:00:00"
        slotDuration="01:00:00"
        slotLabelFormat={{ hour: 'numeric', meridiem: 'narrow' }}
        eventMinHeight={16}
        scrollTime={scrollTime}
        height={360}
        nowIndicator
        events={events}
        datesSet={(range) => setRangeEnd(range.end)}
        eventClick={(info) => {
          if (selectedId === info.event.id) {
            setSelectedId(null)
          } else {
            setSelectedId(info.event.id)
          }
        }}
      />
      {selected && <LogDetail log={selected} onClose={() => setSelectedId(null)} />}
      {selectedTask && <PlannedDetail task={selectedTask} now={now} onClose={() => setSelectedId(null)} />}
    </Card>
  )
}

function LogDetail({ log, onClose }: { log: LogEntry; onClose: () => void }) {
  const { state } = useStore()
  const device = getDevice(log.deviceId)
  const session = device?.sessions.find((s) => s.id === log.sessionId)
  const caregiver = state.caregivers.find((c) => c.id === log.caregiverId)
  let name = 'Unknown'
  let color = '#755339'
  if (caregiver) {
    name = caregiver.name
    color = caregiver.color
  }
  const description = describeLog(log)
  const notes = logNotes(log)

  return (
    <div className="mt-2 rounded-[14px] bg-lilac px-3 py-2.5 text-sm">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-semibold">
            {device?.name || log.deviceId}
            {session && <span className="font-normal text-cocoa"> · {session.label}</span>}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-cocoa">
            <Dot color={color} /> {name} · {formatDateTime(log.timestamp)}
          </div>
        </div>
        <button onClick={onClose} aria-label="Close" className="-mt-1 -mr-1 h-8 w-8 shrink-0 text-cocoa">
          ✕
        </button>
      </div>
      {description && <p className="mt-2">{description}</p>}
      {notes && <p className="mt-1 text-cocoa italic">“{notes}”</p>}
    </div>
  )
}

/** Tapped a gray (not done yet) task: when it's due, and a shortcut to log it if it's today's. */
function PlannedDetail({ task, now, onClose }: { task: PlannedTask; now: Date; onClose: () => void }) {
  const late = Math.floor((now.getTime() - task.scheduled.getTime()) / 60000)
  let status = `Due ${formatTime(task.scheduled.toISOString())}`
  if (!isSameDay(task.scheduled, now)) {
    status = `Scheduled ${formatDateTime(task.scheduled.toISOString())}`
  } else if (late >= OVERDUE_GRACE_MINUTES) {
    status = `Overdue by ${formatMinutes(late)} (due ${formatTime(task.scheduled.toISOString())})`
  }

  return (
    <div className="mt-2 rounded-[14px] bg-lilac px-3 py-2.5 text-sm">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-semibold">
            {task.title}
            <span className="font-normal text-cocoa"> · {task.label}</span>
          </div>
          <div className={late >= OVERDUE_GRACE_MINUTES && isSameDay(task.scheduled, now) ? 'mt-0.5 text-xs font-semibold text-rose' : 'mt-0.5 text-xs text-cocoa'}>
            Not done yet · {status}
          </div>
        </div>
        <button onClick={onClose} aria-label="Close" className="-mt-1 -mr-1 h-8 w-8 shrink-0 text-cocoa">
          ✕
        </button>
      </div>
      {isSameDay(task.scheduled, now) && (
        <Link
          to={`/log/${task.deviceId}`}
          state={{ sessionId: task.sessionId }}
          className="mt-2 flex min-h-10 items-center justify-center rounded-full bg-sea text-sm font-bold text-white"
        >
          Log it now
        </Link>
      )}
    </div>
  )
}
