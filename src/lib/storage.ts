// All app data lives in this browser's localStorage (single-phone demo).
import { makeSeed, seedCaregivers, SEED_VERSION } from '../data/seed'
import type { AppState } from '../types'

const KEY = 'care-handoff-v1'

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const saved = JSON.parse(raw) as AppState
      if (saved.seedVersion !== SEED_VERSION) {
        // the demo data changed since this was saved: start over with the new demo data
        return makeSeed()
      }
      if (!saved.lastDoctorVisit) {
        // saved before the doctor's note existed
        saved.lastDoctorVisit = makeSeed().lastDoctorVisit
      }
      for (const c of saved.caregivers) {
        // saved before caregiver roles existed: seed caregivers get their seed role
        c.role ??= seedCaregivers.find((s) => s.id === c.id)?.role
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

// Small cache for AI results, tied to the data they were written from (key), so a reload doesn't re-ask.
export function loadCached<T>(name: string, key: string): T | null {
  try {
    const raw = localStorage.getItem(`care-cache-${name}`)
    if (raw) {
      const cached = JSON.parse(raw) as { key: string; value: T }
      if (cached.key === key) {
        return cached.value
      }
    }
  } catch {
    // no cache
  }
  return null
}

export function saveCached<T>(name: string, key: string, value: T): void {
  try {
    localStorage.setItem(`care-cache-${name}`, JSON.stringify({ key, value }))
  } catch {
    // storage blocked: just re-ask next time
  }
}
