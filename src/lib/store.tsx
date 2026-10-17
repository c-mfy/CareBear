import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { caregiverColors } from '../data/patient'
import { makeSeed } from '../data/seed'
import type { AppState, Caregiver, FieldValue, Handoff, LogEntry } from '../types'
import { loadState, saveState } from './storage'

interface Store {
  state: AppState
  onShift: Caregiver | null
  addCaregiver: (name: string) => Caregiver
  checkIn: (caregiverId: string, tagId: string) => void
  addLog: (deviceId: string, sessionId: string, values: Record<string, FieldValue>) => void
  completeHandoff: (overallNotes: string, summaryBullets: string[], flagged: boolean, flagReasons: string[]) => void
  shiftLogs: () => LogEntry[]
  setLastDoctorVisit: (date: string) => void
  resetDemo: () => void
}

const StoreContext = createContext<Store | null>(null)

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(loadState)

  useEffect(() => {
    saveState(state)
  }, [state])

  let onShift: Caregiver | null = null
  if (state.currentShift) {
    const id = state.currentShift.caregiverId
    onShift = state.caregivers.find((c) => c.id === id) || null
  }

  function addCaregiver(name: string): Caregiver {
    const color = caregiverColors[state.caregivers.length % caregiverColors.length]
    const caregiver: Caregiver = { id: newId('cg'), name: name.trim(), color }
    setState((s) => ({ ...s, caregivers: [...s.caregivers, caregiver] }))
    return caregiver
  }

  /** EVV: only call with a door tag id that matched DOOR_TAG_ID */
  function checkIn(caregiverId: string, tagId: string) {
    setState((s) => ({
      ...s,
      currentShift: { caregiverId, start: new Date().toISOString(), tagId },
    }))
  }

  function addLog(deviceId: string, sessionId: string, values: Record<string, FieldValue>) {
    if (!state.currentShift) {
      return
    }
    const log: LogEntry = {
      id: newId('log'),
      deviceId,
      sessionId,
      caregiverId: state.currentShift.caregiverId,
      timestamp: new Date().toISOString(),
      values,
    }
    setState((s) => ({ ...s, logs: [...s.logs, log] }))
  }

  function shiftLogs(): LogEntry[] {
    const shift = state.currentShift
    if (!shift) {
      return []
    }
    return state.logs.filter(
      (l) => l.caregiverId === shift.caregiverId && l.timestamp >= shift.start,
    )
  }

  function completeHandoff(overallNotes: string, summaryBullets: string[], flagged: boolean, flagReasons: string[]) {
    const shift = state.currentShift
    if (!shift) {
      return
    }
    const handoff: Handoff = {
      id: newId('handoff'),
      caregiverId: shift.caregiverId,
      start: shift.start,
      end: new Date().toISOString(),
      overallNotes,
      logIds: shiftLogs().map((l) => l.id),
      summaryBullets,
      tagId: shift.tagId,
      flagged,
      flagReasons: flagged ? flagReasons : [],
    }
    // Logs the caregiver out of the team (ends the shift)
    setState((s) => ({ ...s, currentShift: null, handoffs: [handoff, ...s.handoffs] }))
  }

  function setLastDoctorVisit(date: string) {
    setState((s) => ({ ...s, lastDoctorVisit: date }))
  }

  function resetDemo() {
    setState(makeSeed())
  }

  const value: Store = {
    state,
    onShift,
    addCaregiver,
    checkIn,
    addLog,
    completeHandoff,
    shiftLogs,
    setLastDoctorVisit,
    resetDemo,
  }
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): Store {
  const ctx = useContext(StoreContext)
  if (!ctx) {
    throw new Error('useStore must be used inside StoreProvider')
  }
  return ctx
}

export function useCaregiver(id: string): Caregiver | undefined {
  const { state } = useStore()
  return state.caregivers.find((c) => c.id === id)
}
