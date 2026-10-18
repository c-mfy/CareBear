import { Link } from 'react-router-dom'
import { CareCalendar } from '../components/CareCalendar'
import { CareTeam } from '../components/CareTeam'
import { Header } from '../components/Header'
import { HistoryList } from '../components/HistoryList'
import { Kuma } from '../components/Kuma'
import { SummaryCard } from '../components/SummaryCard'
import { TaskList } from '../components/TaskList'
import { Page, PillBar, Section } from '../components/ui'
import { patient } from '../data/patient'
import { formatMinutes } from '../lib/format'
import { useStore } from '../lib/store'
import { buildTodayTasks } from '../lib/tasks'
import { useNow } from '../lib/useNow'

/** Single scrolling page, laid out like the Figma home screen. */
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

  // Kuma is sad while anything is overdue, proud otherwise
  let mood: 'sad' | 'proud' = 'proud'
  if (overdue.length > 0) {
    mood = 'sad'
  }

  let overdueTitle = `${overdue.length} overdue tasks`
  if (overdue.length === 1) {
    overdueTitle = '1 overdue task'
  }

  let bar = <PillBar>Tap door tag to check in</PillBar>
  if (onShift) {
    bar = (
      <PillBar>
        <Link to="/handoff" className="flex w-full flex-col items-center leading-tight">
          <span className="font-body text-xs font-bold text-white/80">{onShift.name} on shift</span>
          <span>Hand off shift →</span>
        </Link>
      </PillBar>
    )
  }

  return (
    <Page bottomBar>
      <Header />
      <main className="px-[25px]">
        {/* Patient name, with Kuma sitting on the overdue banner */}
        <div className="flex items-start justify-between">
          <div className="pt-1 pl-[3px]">
            <h1 className="font-display text-[32px] leading-tight font-bold text-sea">{patient.nickname}</h1>
            <p className="text-base">
              {patient.age} yrs | {condition}
            </p>
          </div>
          <Kuma mood={mood} className="relative z-10 mt-[31px] mr-[25px]" />
        </div>

        {overdue.length > 0 && (
          <div role="alert" className="-mt-[35px] rounded-[22px] bg-rose px-[21px] pt-[13px] pb-[14px] text-white">
            <p className="text-xl leading-tight font-black uppercase">{overdueTitle}</p>
            <ul className="mt-1.5 space-y-1">
              {overdue.map((t) => (
                <li key={`${t.deviceId}-${t.sessionId}`}>
                  <Link
                    to={`/log/${t.deviceId}`}
                    state={{ sessionId: t.sessionId }}
                    className="flex items-center justify-between gap-2 text-xs font-bold"
                  >
                    <span className="flex items-center gap-2 pl-3">
                      <span className="h-1 w-1 shrink-0 rounded-full bg-white" />
                      {t.title} | {t.label}
                    </span>
                    <span className="shrink-0">{formatMinutes(t.overdueMinutes)} late &gt;</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Section title="Summary">
          <SummaryCard />
        </Section>

        <Section
          title="Today’s Care"
          titleExtra={
            <span className="text-xs font-black text-sea">
              {doneCount} of {tasks.length} complete
            </span>
          }
        >
          <TaskList now={now} />
        </Section>

        <Section title="Calendar">
          <CareCalendar />
        </Section>

        <Section title="Care History">
          <HistoryList limit={4} />
        </Section>

        <CareTeam />

        <button onClick={handleReset} className="mt-6 min-h-12 w-full text-xs underline">
          Reset demo data
        </button>
      </main>
      {bar}
    </Page>
  )
}
