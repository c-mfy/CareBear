export type FieldType = 'check' | 'number' | 'notes'

export interface Field {
  id: string
  label: string
  type: FieldType
  unit?: string
}

export interface Session {
  id: string
  label: string
  /** Auto-pick window, in 24h hours: startHour <= now < endHour */
  startHour: number
  endHour: number
  /** Planned time shown on the to-do list, "HH:MM" */
  scheduledTime?: string
  /** 'daily' sessions show on the to-do list; 'quarterly' never auto-picks */
  recurrence: 'daily' | 'quarterly'
  fields: Field[]
}

export interface Device {
  id: string // also the NFC URL slug: /log/<id>
  name: string
  model: string
  sessions: Session[]
}

export interface Patient {
  name: string
  nickname: string
  age: number
  summary: string
  /** ISO date of last G-tube button change (for the every-3-months session) */
  lastGtubeButtonChange: string
}

export interface Caregiver {
  id: string
  name: string
  color: string // calendar + chip color
}

export type FieldValue = boolean | number | string

export interface LogEntry {
  id: string
  deviceId: string
  sessionId: string
  caregiverId: string
  timestamp: string // ISO
  values: Record<string, FieldValue>
}

export interface Shift {
  caregiverId: string
  start: string // ISO
  /** EVV: id of the door NFC tag that was tapped to check in (proves location) */
  tagId: string
}

export interface Handoff {
  id: string
  caregiverId: string
  start: string
  end: string
  overallNotes: string
  logIds: string[]
  summaryBullets: string[]
  /** EVV: door tag used to check in for this shift (missing on seed/older data) */
  tagId?: string
}

export interface AppState {
  caregivers: Caregiver[]
  currentShift: Shift | null
  logs: LogEntry[]
  handoffs: Handoff[]
  /** Local date "YYYY-MM-DD" of the last doctor's visit; the doctor's note covers everything since */
  lastDoctorVisit: string
}

export interface NoteSection {
  title: string
  bullets: string[]
}

export interface Suggestion {
  label: string
  values: Record<string, FieldValue>
}
