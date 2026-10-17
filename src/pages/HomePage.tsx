import { Link } from 'react-router-dom'
import { CareCalendar } from '../components/CareCalendar'
import { Header } from '../components/Header'
import { HistoryList } from '../components/HistoryList'
import { SummaryCard } from '../components/SummaryCard'
import { TaskList } from '../components/TaskList'
import { BottomBar, Card, Dot, Page, Section, Tag } from '../components/ui'
import { patient } from '../data/patient'
import { useStore } from '../lib/store'
import { buildTodayTasks } from '../lib/tasks'

/** Single scrolling page, laid out like the low-fi home screen. */
export function HomePage() {
  const { state, onShift, resetDemo } = useStore()
  const tasks = buildTodayTasks(state.logs)
  const doneCount = tasks.filter((t) => t.done).length
  const condition = patient.summary.split('.')[0] // e.g. "Cystic fibrosis"

  function handleReset() {
    if (window.confirm('Reset all demo data back to the seed?')) {
      resetDemo()
    }
  }

  let bar = (
    <BottomBar>
      <span className="text-sm">No one on shift</span>
      <Link to="/checkin" className="flex min-h-11 items-center rounded-full bg-teal px-5 text-sm">
        Check in →
      </Link>
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
        </Card>

        <div className="mt-2.5">
          <SummaryCard />
        </div>

        <Section
          title="Today's care"
          right={
            <span className="text-xs font-semibold text-cocoa">
              {doneCount} of {tasks.length} complete
            </span>
          }
        >
          <TaskList />
        </Section>

        <Section title="Calendar">
          <CareCalendar />
        </Section>

        <Section title="Patient history">
          <HistoryList />
        </Section>

        <Section
          title="Care team"
          right={
            <Link to="/checkin" className="text-xs font-semibold text-teal">
              Add / check in
            </Link>
          }
        >
          <Card className="space-y-1 py-2">
            {state.caregivers.map((c) => (
              <div key={c.id} className="flex min-h-10 items-center gap-2.5 text-sm">
                <Dot color={c.color} />
                <span className="flex-1">{c.name}</span>
                {state.currentShift?.caregiverId === c.id && <Tag className="bg-mist text-teal">On shift</Tag>}
              </div>
            ))}
          </Card>
        </Section>

        <button onClick={handleReset} className="mt-6 min-h-12 w-full text-xs text-cocoa underline">
          Reset demo data
        </button>
      </main>
      {bar}
    </Page>
  )
}
