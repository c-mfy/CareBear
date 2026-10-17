import { useState } from 'react'
import { useStore } from '../lib/store'
import type { Caregiver } from '../types'
import { Button, Dot } from './ui'

/** "Who's logging?" list + add-a-caregiver form (name only, no login). */
export function CaregiverPicker({ onPick }: { onPick: (c: Caregiver) => void }) {
  const { state, addCaregiver } = useStore()
  const [name, setName] = useState('')

  function handleAdd() {
    if (!name.trim()) {
      return
    }
    const c = addCaregiver(name)
    setName('')
    onPick(c)
  }

  return (
    <div className="space-y-2">
      {state.caregivers.map((c) => (
        <button
          key={c.id}
          onClick={() => onPick(c)}
          className="flex min-h-14 w-full items-center gap-3 rounded-xl bg-white px-4 text-left font-semibold shadow-sm active:scale-[0.98]"
        >
          <Dot color={c.color} /> {c.name}
        </button>
      ))}
      <div className="flex gap-2 pt-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Add a caregiver"
          className="min-h-12 flex-1 rounded-xl border border-gray-300 bg-white px-3"
        />
        <Button className="w-auto" onClick={handleAdd} disabled={!name.trim()}>
          Add
        </Button>
      </div>
    </div>
  )
}
