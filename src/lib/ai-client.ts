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

function cleanValues(session: Session, raw: Record<string, unknown>): Record<string, FieldValue> {
  const out: Record<string, FieldValue> = {}
  for (const field of session.fields) {
    const value = raw[field.id]
    if (field.type === 'check' && typeof value === 'boolean') {
      out[field.id] = value
    } else if (field.type === 'number' && typeof value === 'number') {
      out[field.id] = value
    } else if (field.type === 'notes' && typeof value === 'string') {
      out[field.id] = value
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
      recent: recent.slice(0, 5).map((log) => log.values),
    })
    const list = (data.suggestions || [])
      .filter((suggestion) => typeof suggestion.label === 'string' && suggestion.values)
      .slice(0, 3)
      .map((suggestion) => ({
        label: suggestion.label as string,
        values: cleanValues(session, suggestion.values || {}),
      }))
    return list.length > 0 ? list : mockSuggestions(session, recent)
  } catch {
    return mockSuggestions(session, recent)
  }
}

export function mockSummary(logs: LogEntry[], overallNotes: string): string[] {
  const bullets: string[] = []
  const sorted = [...logs].sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  for (const log of sorted) {
    const device = getDevice(log.deviceId)
    const session = device?.sessions.find((item) => item.id === log.sessionId)
    let line = `${device?.name} (${session?.label}, ${formatTime(log.timestamp)}): ${describeLog(log)}`
    const notes = logNotes(log)
    if (notes) {
      line += ` — "${notes}"`
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
    const entries = logs.map((log) => {
      const device = getDevice(log.deviceId)
      return {
        device: device?.name,
        session: device?.sessions.find((item) => item.id === log.sessionId)?.label,
        time: formatTime(log.timestamp),
        done: describeLog(log),
        notes: logNotes(log),
      }
    })
    const data = await callAi<{ bullets?: unknown[] }>({
      task: 'summary',
      caregiver: caregiverName,
      entries,
      overallNotes,
    })
    const bullets = (data.bullets || []).filter((bullet): bullet is string => typeof bullet === 'string')
    return bullets.length > 0 ? bullets : mockSummary(logs, overallNotes)
  } catch {
    return mockSummary(logs, overallNotes)
  }
}
