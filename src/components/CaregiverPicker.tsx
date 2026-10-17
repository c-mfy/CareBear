import { useState } from 'react'
import { useStore } from '../lib/store'
import type { Caregiver } from '../types'
import { cx } from '../lib/cx'
import { Button, Dot } from './ui'

/** "Who's logging?" list + add-a-caregiver form (name + family/staff, no login). */
export function CaregiverPicker({ onPick }: { onPick: (c: Caregiver) => void }) {
  const { state, addCaregiver } = useStore()
  const [name, setName] = useState('')
  const [role, setRole] = useState<'staff' | 'family'>('family')

  function handleAdd() {
    if (!name.trim()) {
      return
    }
    const c = addCaregiver(name, role)
    setName('')
    onPick(c)
  }

  return (
    <div className="space-y-2">
      {state.caregivers.map((c) => (
        <button
          key={c.id}
          onClick={() => onPick(c)}
          className="flex min-h-14 w-full items-center gap-3 rounded-[18px] bg-white px-4 text-left font-semibold active:scale-[0.98]"
        >
          <Dot color={c.color} />
          <span className="flex-1">{c.name}</span>
          <span className="text-cocoa">›</span>
        </button>
      ))}
      <div className="flex gap-2 pt-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Add a caregiver"
          className="min-h-12 flex-1 rounded-full border-[1.5px] border-aqua bg-white px-4 outline-none focus:border-teal"
        />
        <Button className="w-auto px-6" onClick={handleAdd} disabled={!name.trim()}>
          Add
        </Button>
      </div>
      <div className="flex gap-1 rounded-full bg-white p-1 text-xs font-semibold" role="radiogroup" aria-label="Role">
        {(
          [
            ['family', 'Family'],
            ['staff', 'Paid nurse / aide'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            role="radio"
            aria-checked={role === value}
            onClick={() => setRole(value)}
            className={cx('min-h-9 flex-1 rounded-full', role === value ? 'bg-teal text-white' : 'text-cocoa')}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
