import { useState, type FormEvent } from 'react'
import { cx } from '../lib/cx'
import { useStore } from '../lib/store'
import type { Caregiver } from '../types'
import { Dot } from './ui'

type Role = 'staff' | 'family'

const ROLES: [Role, string][] = [
  ['family', 'Family'],
  ['staff', 'Paid nurse / aide'],
]

/**
 * "Who's logging?" list. A small "+ Add caregiver" link opens a form right below the names
 * (nickname + family/paid). Adding someone checks them in straight away. No login.
 */
export function CaregiverPicker({ onPick }: { onPick: (c: Caregiver) => void }) {
  const { state, addCaregiver } = useStore()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [role, setRole] = useState<Role>('family')

  function openForm() {
    setName('')
    setRole('family')
    setAdding(true)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      return
    }
    const c = addCaregiver(name, role)
    onPick(c) // check in as the new person right away
  }

  return (
    <div className="space-y-2">
      {state.caregivers
        .filter((c) => !c.removed)
        .map((c) => (
          <button
            key={c.id}
            onClick={() => onPick(c)}
            className="flex min-h-14 w-full items-center gap-3 rounded-[18px] bg-blossom px-4 text-left font-bold active:scale-[0.98]"
          >
            <Dot color={c.color} />
            <span className="flex-1">{c.name}</span>
            <span className="text-cocoa">›</span>
          </button>
        ))}

      {!adding && (
        <button onClick={openForm} className="block min-h-11 w-full text-center text-sm font-bold text-sea">
          + Add caregiver
        </button>
      )}

      {adding && (
        <form onSubmit={handleSubmit} className="space-y-3 rounded-[18px] bg-blossom p-4 text-left">
          <label className="block">
            <span className="text-sm font-bold">Nickname</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Grandma, Nurse Sam"
              autoFocus
              enterKeyHint="done"
              className="mt-1.5 min-h-11 w-full rounded-full border-[1.5px] border-aqua bg-white px-4 outline-none focus:border-sea"
            />
          </label>

          <div>
            <span className="text-sm font-bold">Family or paid?</span>
            <div className="mt-1.5 flex gap-1 rounded-full bg-white p-1 text-xs font-bold" role="radiogroup" aria-label="Role">
              {ROLES.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={role === value}
                  onClick={() => setRole(value)}
                  className={cx(
                    'min-h-9 flex-1 rounded-full',
                    role === value && 'bg-sea text-white',
                    role !== value && 'text-cocoa',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-4 pt-1">
            <button type="button" onClick={() => setAdding(false)} className="min-h-10 px-2 text-sm font-bold text-cocoa">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="min-h-10 rounded-full bg-sea px-5 text-sm font-bold text-white disabled:opacity-40"
            >
              Add &amp; check in
            </button>
          </div>
        </form>
      )}
    </div>
  )
}