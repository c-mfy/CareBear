import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../lib/store'
import { Card, Section, Tag } from './ui'

/**
 * Home page "Care Bears" (Figma): who's on the team, with Edit to remove someone.
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

  let editLabel = 'Edit'
  if (editing) {
    editLabel = 'Done'
  }

  return (
    <Section
      title="Care Bears"
      right={
        <span className="flex gap-4 text-xs font-black text-sea">
          <button onClick={toggleEditing}>{editLabel}</button>
          <Link to="/timesheet">Timesheet &gt;</Link>
        </span>
      }
    >
      <Card className="px-[27px] py-[22px]">
        <ul className="space-y-4">
          {team.map((c) => {
            const onShift = state.currentShift?.caregiverId === c.id
            if (confirmId === c.id) {
              return (
                <li key={c.id} className="rounded-xl bg-blossom px-3 py-2.5 text-sm">
                  <p>
                    Remove <b>{c.name}</b> from the care team? Their past entries stay in the history.
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => {
                        removeCaregiver(c.id)
                        setConfirmId(null)
                      }}
                      className="min-h-10 flex-1 rounded-full bg-rose font-bold text-white"
                    >
                      Remove
                    </button>
                    <button
                      onClick={() => setConfirmId(null)}
                      className="min-h-10 flex-1 rounded-full border-[1.5px] border-aqua bg-white font-bold"
                    >
                      Cancel
                    </button>
                  </div>
                </li>
              )
            }
            return (
              <li key={c.id} className="flex min-h-6 items-center gap-4">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: c.color }} />
                <span className="flex-1 text-base font-bold">{c.name}</span>
                {c.role === 'staff' && <span className="text-xs font-light">Paid staff</span>}
                {onShift && <Tag className="bg-mist text-sea">On shift</Tag>}
                {editing && !onShift && (
                  <button
                    onClick={() => setConfirmId(c.id)}
                    className="min-h-9 rounded-full border-[1.5px] border-rose px-3 text-xs font-bold text-rose"
                  >
                    Remove
                  </button>
                )}
              </li>
            )
          })}
        </ul>
        {team.length === 0 && <p className="text-sm">No one on the care team.</p>}
      </Card>
      {editing && (
        <p className="mt-1.5 px-0.5 text-xs">Whoever is on shift can't be removed until they check out.</p>
      )}
    </Section>
  )
}
