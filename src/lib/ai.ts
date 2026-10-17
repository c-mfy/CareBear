// Client side of the AI features. Calls /api/ai (Vercel function, holds the Gemini key).
// If the call fails for any reason (no key, local `vite` dev, bad Wi-Fi), we fall back
// to the mock functions below so the demo never breaks.

import { getDevice } from '../data/patient'
import type { Device, FieldValue, LogEntry, Session, Suggestion } from '../types'
import { describeLog, formatTime, logNotes } from './format'

const TIMEOUT_MS = 8000

async function callAi<T>(body: unknown): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    if (!res.ok) {
      throw new Error(`AI request failed: ${res.status}`)
    }
    return (await res.json()) as T
  } finally {
    clearTimeout(timer)
  }
}

// ---------- Suggestions on the log screen ----------

/** Drop anything the model invented that doesn't match a real field. */
function cleanValues(session: Session, raw: Record<string, unknown>): Record<string, FieldValue> {
  const out: Record<string, FieldValue> = {}
  for (const field of session.fields) {
    const v = raw[field.id]
    if (field.type === 'check' && typeof v === 'boolean') {
      out[field.id] = v
    } else if (field.type === 'number' && typeof v === 'number') {
      out[field.id] = v
    } else if (field.type === 'notes' && typeof v === 'string') {
      out[field.id] = v
    }
  }
  return out
}

export function mockSuggestions(session: Session, recent: LogEntry[]): Suggestion[] {
  const last = recent[0]
  const allDone: Record<string, FieldValue> = {}
  for (const field of session.fields) {
    if (field.type === 'check') {
      allDone[field.id] = true
    } else if (field.type === 'number' && last && typeof last.values[field.id] === 'number') {
      allDone[field.id] = last.values[field.id]
    }
  }
  allDone.notes = 'No issues.'
  const list: Suggestion[] = [{ label: 'All done, no issues', values: allDone }]
  if (last) {
    const same = { ...last.values }
    delete same.notes
    list.push({ label: 'Same as last time', values: same })
  }
  return list
}

export async function getSuggestions(
  device: Device,
  session: Session,
  recent: LogEntry[],
): Promise<Suggestion[]> {
  try {
    const data = await callAi<{ suggestions?: { label?: string; values?: Record<string, unknown> }[] }>({
      task: 'suggest',
      device: device.name,
      session: session.label,
      fields: session.fields,
      recent: recent.slice(0, 5).map((l) => l.values),
    })
    const list = (data.suggestions || [])
      .filter((s) => typeof s.label === 'string' && s.values)
      .slice(0, 3)
      .map((s) => ({ label: s.label as string, values: cleanValues(session, s.values || {}) }))
    if (list.length === 0) {
      return mockSuggestions(session, recent)
    }
    return list
  } catch {
    return mockSuggestions(session, recent)
  }
}

// ---------- Shift summary on handoff ----------

export function mockSummary(logs: LogEntry[], overallNotes: string): string[] {
  const bullets: string[] = []
  const sorted = [...logs].sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  for (const log of sorted) {
    const device = getDevice(log.deviceId)
    const session = device?.sessions.find((s) => s.id === log.sessionId)
    let line = `${device?.name} (${session?.label}, ${formatTime(log.timestamp)}): ${describeLog(log)}`
    const n = logNotes(log)
    if (n) {
      line += ` — "${n}"`
    }
    bullets.push(line)
  }
  if (overallNotes.trim()) {
    bullets.unshift(overallNotes.trim())
  }
  if (bullets.length === 0) {
    bullets.push('Nothing was logged this shift.')
  }
  return bullets
}

export async function getShiftSummary(
  caregiverName: string,
  logs: LogEntry[],
  overallNotes: string,
): Promise<string[]> {
  try {
    const entries = logs.map((l) => {
      const device = getDevice(l.deviceId)
      return {
        device: device?.name,
        session: device?.sessions.find((s) => s.id === l.sessionId)?.label,
        time: formatTime(l.timestamp),
        done: describeLog(l),
        notes: logNotes(l),
      }
    })
    const data = await callAi<{ bullets?: unknown[] }>({
      task: 'summary',
      caregiver: caregiverName,
      entries,
      overallNotes,
    })
    const bullets = (data.bullets || []).filter((b): b is string => typeof b === 'string')
    if (bullets.length === 0) {
      return mockSummary(logs, overallNotes)
    }
    return bullets
  } catch {
    return mockSummary(logs, overallNotes)
  }
}
