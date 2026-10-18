import { Header } from '../components/Header'
import { HistoryList } from '../components/HistoryList'
import { Page } from '../components/ui'
import { useStore } from '../lib/store'

/** Every past care visit (handoff), newest first. */
export function HistoryPage() {
  const { state } = useStore()
  const flagged = state.handoffs.filter((h) => h.flagged).length
  return (
    <Page>
      <Header title="Patient history" back />
      <main className="px-4 pt-2">
        <p className="mb-3 px-1 text-xs text-cocoa">
          {state.handoffs.length} visits · {flagged} flagged. Tap a visit to see its summary.
        </p>
        <HistoryList />
      </main>
    </Page>
  )
}
