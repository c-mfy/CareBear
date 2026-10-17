import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import { getDevice } from '../data/patient'
import { useStore } from '../lib/store'
import { Card, Dot } from './ui'

const EVENT_MINUTES = 30 // a log is a point in time; draw it as a 30-min block

/** Week view of everything logged, colored by the caregiver who logged it. */
export function CareCalendar() {
  const { state } = useStore()

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
        slotMinTime="05:00:00"
        slotMaxTime="24:00:00"
        scrollTime="06:00:00"
        height={420}
        nowIndicator
        events={events}
      />
    </Card>
  )
}
