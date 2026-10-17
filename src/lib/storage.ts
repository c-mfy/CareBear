// All app data lives in this browser's localStorage (single-phone demo).
import { makeSeed } from '../data/seed'
import type { AppState } from '../types'

const KEY = 'care-handoff-v1'

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const saved = JSON.parse(raw) as AppState
      if (!saved.lastDoctorVisit) {
        // saved before the doctor's note existed
        saved.lastDoctorVisit = makeSeed().lastDoctorVisit
      }
      return saved
    }
  } catch {
    // storage blocked or corrupted: fall through to seed
  }
  return makeSeed()
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // storage full or blocked (e.g. Private Browsing): app still works in memory
  }
}
