import { Link } from 'react-router-dom'
import { CareCalendar } from '../components/CareCalendar'
import { Header } from '../components/Header'
import { HistoryList } from '../components/HistoryList'
import { SummaryCard } from '../components/SummaryCard'
import { TaskList } from '../components/TaskList'
import { Card, Dot, Page, Section } from '../components/ui'
import { useStore } from '../lib/store'

/** Single scrolling page, laid out like the low-fi home screen. */
export function HomePage() {
  const { state, resetDemo } = useStore()

  function handleReset() {
    if (window.confirm('Reset all demo data back to the seed?')) {
      resetDemo()
    }
  }

  return (
    <Page>
      <Header />
      <main className="px-4">
        <div className="mt-4">
          <SummaryCard />
        </div>

        <Section title="Your Tasks">
          <TaskList />
        </Section>

        <Section title="Calendar">
          <CareCalendar />
        </Section>

        <Section title="Patient History">
          <HistoryList />
        </Section>

        <Section
          title="Care Team"
          right={
            <Link to="/checkin" className="text-sm font-semibold text-brand">
              Add / check in
            </Link>
          }
        >
          <Card className="space-y-2">
            {state.caregivers.map((c) => (
              <div key={c.id} className="flex min-h-10 items-center gap-2 text-sm">
                <Dot color={c.color} />
                <span className="flex-1">{c.name}</span>
                {state.currentShift?.caregiverId === c.id && (
                  <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold">On shift</span>
                )}
              </div>
            ))}
          </Card>
        </Section>

        <button onClick={handleReset} className="mt-8 min-h-12 w-full text-sm text-gray-400 underline">
          Reset demo data
        </button>
      </main>
    </Page>
  )
}
