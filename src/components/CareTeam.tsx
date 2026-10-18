import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../lib/store'
import { Card, Dot, Section, Tag } from './ui'

/**
 * Home page "Care Team": who's on the team, with Edit to remove someone.
 * Removing keeps their name on everything they already logged (history, timesheets, EVV records).
 */
export function CareTeam() {
  const { state, removeCaregiver } = useStore()
  const [editing, setEditing] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const team = state.caregivers.filter((c) => !c.removed)

  function toggleEditing() {
    setEditing(!editing)
    setConfirmId(null)
  }

  return (
    <Section
      title="Care Team"
      right={
        <span className="flex gap-4 text-xs font-semibold text-teal">
          <button onClick={toggleEditing}>{editing ? 'Done' : 'Edit'}</button>
          <Link to="/timesheet">Timesheet ›</Link>
        </span>
      }
    >
      <Card className="space-y-1 py-2">
        {team.map((c) => {
          const onShift = state.currentShift?.caregiverId === c.id
          if (confirmId === c.id) {
            return (
              <div key={c.id} className="rounded-xl bg-lilac px-3 py-2.5 text-sm">
                <p>
                  Remove <b>{c.name}</b> from the care team? Their past entries stay in the history.
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => {
                      removeCaregiver(c.id)
                      setConfirmId(null)
                    }}
                    className="min-h-10 flex-1 rounded-full bg-rose font-semibold text-white"
                  >
                    Remove
                  </button>
                  <button
                    onClick={() => setConfirmId(null)}
                    className="min-h-10 flex-1 rounded-full border-[1.5px] border-aqua bg-white font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )
          }
          return (
            <div key={c.id} className="flex min-h-10 items-center gap-2.5 text-sm">
              <Dot color={c.color} />
              <span className="flex-1">{c.name}</span>
              {c.role === 'staff' && <span className="text-xs text-cocoa">Paid staff</span>}
              {onShift && <Tag className="bg-mist text-teal">On shift</Tag>}
              {editing && !onShift && (
                <button
                  onClick={() => setConfirmId(c.id)}
                  className="min-h-9 rounded-full border-[1.5px] border-rose px-3 text-xs font-semibold text-rose"
                >
                  Remove
                </button>
              )}
            </div>
          )
        })}
        {team.length === 0 && <p className="text-sm text-cocoa">No one on the care team.</p>}
      </Card>
      <p className="mt-1.5 px-0.5 text-xs text-cocoa">
        {editing ? "Whoever is on shift can't be removed until they check out." : 'New caregivers join at the door tag.'}
      </p>
    </Section>
  )
}
