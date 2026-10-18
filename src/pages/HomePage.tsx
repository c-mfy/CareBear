import { Link } from 'react-router-dom'
import { CareCalendar } from '../components/CareCalendar'
import { Header } from '../components/Header'
import { HistoryList } from '../components/HistoryList'
import { SummaryCard } from '../components/SummaryCard'
import { TaskList } from '../components/TaskList'
import { BottomBar, Card, Dot, Page, Section, Tag } from '../components/ui'
import { patient } from '../data/patient'
import { useStore } from '../lib/store'
import { formatMinutes } from '../lib/format'
import { buildTodayTasks } from '../lib/tasks'
import { useNow } from '../lib/useNow'

/** Single scrolling page, laid out like the low-fi home screen. */
export function HomePage() {
  const { state, onShift, resetDemo } = useStore()
  const now = useNow() // re-renders every minute so tasks turn overdue on their own
  const tasks = buildTodayTasks(state.logs, now)
  const doneCount = tasks.filter((t) => t.done).length
  const overdue = tasks.filter((t) => t.overdueMinutes > 0).sort((a, b) => b.overdueMinutes - a.overdueMinutes)
  const condition = patient.summary.split('.')[0] // e.g. "Cystic fibrosis"

  function handleReset() {
    if (window.confirm('Reset all demo data back to the seed?')) {
      resetDemo()
    }
  }

  let bar = (
    <BottomBar>
      <span className="text-sm">No one on shift</span>
      <span className="flex min-h-11 items-center rounded-full bg-teal px-5 text-sm">Tap door tag to check in</span>
    </BottomBar>
  )
  if (onShift) {
    bar = (
      <BottomBar>
        <span className="truncate text-sm">{onShift.name} on shift</span>
        <Link to="/handoff" className="flex min-h-11 shrink-0 items-center rounded-full bg-teal px-5 text-sm">
          Hand off shift →
        </Link>
      </BottomBar>
    )
  }

  return (
    <Page bottomBar>
      <Header />
      <main className="px-4">
        {/* Patient header */}
        <Card className="mt-2 flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blush text-xl font-bold">
            {patient.nickname.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl leading-tight font-bold">{patient.nickname}</h1>
            <p className="text-xs text-cocoa">
              {patient.age} yrs · {condition}
            </p>
          </div>
          <Link
            to="/emergency"
            className="flex min-h-11 shrink-0 items-center gap-1 rounded-full bg-[#d6336c] px-4 text-sm font-bold text-white"
          >
            Emergency
          </Link>
        </Card>

        <div className="mt-2.5">
          <SummaryCard />
        </div>

        <Section
          title="Today's Care"
          right={
            <span className="text-xs font-semibold text-cocoa">
              {doneCount} of {tasks.length} complete
            </span>
          }
        >
          {overdue.length > 0 && (
            <div role="alert" className="mb-2 rounded-[18px] bg-rose px-4 py-3 text-white">
              <p className="text-sm font-bold">
                ⚠ {overdue.length} overdue {overdue.length === 1 ? 'task' : 'tasks'}
              </p>
              <ul className="mt-1.5 space-y-1">
                {overdue.map((t) => (
                  <li key={`${t.deviceId}-${t.sessionId}`}>
                    <Link
                      to={`/log/${t.deviceId}`}
                      state={{ sessionId: t.sessionId }}
                      className="flex min-h-9 items-center justify-between gap-2 text-[13px]"
                    >
                      <span className="font-semibold">
                        {t.title} · {t.label}
                      </span>
                      <span className="shrink-0 text-xs">{formatMinutes(t.overdueMinutes)} late ›</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <TaskList now={now} />
        </Section>

        <Section title="Calendar">
          <CareCalendar />
        </Section>

        <Section title="Patient History">
          <HistoryList limit={6} />
        </Section>

        <Section
          title="Care Team"
          right={
            <Link to="/timesheet" className="text-xs font-semibold text-teal">
              Timesheet ›
            </Link>
          }
        >
          <Card className="space-y-1 py-2">
            {state.caregivers.map((c) => (
              <div key={c.id} className="flex min-h-10 items-center gap-2.5 text-sm">
                <Dot color={c.color} />
                <span className="flex-1">{c.name}</span>
                {c.role === 'staff' && <span className="text-xs text-cocoa">Paid staff</span>}
                {state.currentShift?.caregiverId === c.id && <Tag className="bg-mist text-teal">On shift</Tag>}
              </div>
            ))}
          </Card>
          <p className="mt-1.5 px-0.5 text-xs text-cocoa">New caregivers join at the door tag.</p>
        </Section>

        <button onClick={handleReset} className="mt-6 min-h-12 w-full text-xs text-cocoa underline">
          Reset demo data
        </button>
      </main>
      {bar}
    </Page>
  )
}
