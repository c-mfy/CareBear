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

// Handoff in progress. Tapping the door tag to check out can open a new Safari tab, so the
// notes/summary written before the tap are kept here instead of only in page state.
const DRAFT_KEY = 'care-handoff-draft-v1'

export interface HandoffDraft {
  shiftStart: string // which shift this draft belongs to
  overallNotes: string
  bullets: string[] | null
  flagChoice: boolean | null
}

export function loadHandoffDraft(shiftStart: string): HandoffDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (raw) {
      const draft = JSON.parse(raw) as HandoffDraft
      if (draft.shiftStart === shiftStart) {
        return draft
      }
    }
  } catch {
    // storage blocked or corrupted: start a fresh draft
  }
  return null
}

export function saveHandoffDraft(draft: HandoffDraft): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  } catch {
    // storage blocked: the draft just won't survive a new tab
  }
}

export function clearHandoffDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY)
  } catch {
    // nothing to clear
  }
}
