import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import { useState } from 'react'
import { getDevice } from '../data/patient'
import { describeLog, formatDateTime, logNotes } from '../lib/format'
import { useStore } from '../lib/store'
import type { LogEntry } from '../types'
import { Card, Dot } from './ui'

const EVENT_MINUTES = 30 // a log is a point in time; draw it as a 30-min block
const FIRST_HOUR = 5

function hourTime(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00:00`
}

/** Scroll so the current hour sits near the top, with an hour of context above it. */
function currentScrollTime(): string {
  return hourTime(Math.max(FIRST_HOUR, new Date().getHours() - 1))
}

/** Week view of everything logged, colored by the caregiver who logged it. Tap an entry for details. */
export function CareCalendar() {
  const { state } = useStore()
  const [scrollTime] = useState(currentScrollTime)
  const [selectedId, setSelectedId] = useState<string | null>(null)

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
    }
  })

  const selected = state.logs.find((l) => l.id === selectedId)

  return (
    <Card className="p-2">
      <div className="mb-2 flex flex-wrap gap-3 px-1 text-xs font-medium text-cocoa">
        {state.caregivers.map((c) => (
          <span key={c.id} className="flex items-center gap-1">
            <Dot color={c.color} /> {c.name}
          </span>
        ))}
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
        eventClick={(info) => {
          if (selectedId === info.event.id) {
            setSelectedId(null)
          } else {
            setSelectedId(info.event.id)
          }
        }}
      />
      {selected && <LogDetail log={selected} onClose={() => setSelectedId(null)} />}
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
