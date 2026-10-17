import { useState } from 'react'
import { Header } from '../components/Header'
import { Card, Page, Section } from '../components/ui'
import {
  emergencyContacts,
  emergencyProcedures,
  patientMedicalInfo,
  telHref,
  type EmergencyProcedure,
} from '../data/emergency'
import { devices, patient } from '../data/patient'
import { cx } from '../lib/cx'
import { formatDate, formatMinutes, formatScheduled, formatTime, fromDateInput } from '../lib/format'
import { useStore } from '../lib/store'
import { useNow } from '../lib/useNow'
import type { LogEntry } from '../types'

/**
 * Emergency info: call 911, what's happening right now (from the logs), contacts, and step-by-step procedures.
 * Open to anyone, no check-in needed: a babysitter or paramedic may be the one holding the phone.
 */
export function EmergencyPage() {
  const { state, onShift } = useStore()
  const now = useNow()
  const [openId, setOpenId] = useState<string | null>(null)

  function latest(filter: (l: LogEntry) => boolean): LogEntry | undefined {
    return state.logs.filter(filter).sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0]
  }

  function ago(iso: string): string {
    return formatMinutes(Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 60000)))
  }

  function when(log: LogEntry | undefined): string {
    if (!log) {
      return 'Nothing logged'
    }
    const who = state.caregivers.find((c) => c.id === log.caregiverId)?.name || 'Unknown'
    const day = new Date(log.timestamp).toDateString() === now.toDateString() ? '' : `${formatDate(new Date(log.timestamp))}, `
    return `${day}${formatTime(log.timestamp)} by ${who} (${ago(log.timestamp)} ago)`
  }

  // Feed: running if the latest pump log is a bedtime start
  const lastPump = latest((l) => l.deviceId === 'feeding-pump' && l.sessionId !== 'gtube-quarterly')
  let feed = 'No feed logged'
  if (lastPump?.sessionId === 'bedtime-start') {
    feed = `Running since ${formatTime(lastPump.timestamp)} at ${lastPump.values.rate} mL/hr (${lastPump.values.loaded} mL loaded)`
  } else if (lastPump) {
    feed = `Not running. Stopped ${formatTime(lastPump.timestamp)}, ${lastPump.values.infused} mL infused`
  }

  const status: [string, string][] = [
    ['Last Trikafta dose', when(latest((l) => l.deviceId === 'trikafta' && l.values.given === true))],
    ['Last breathing treatment', when(latest((l) => l.deviceId === 'nebulizer'))],
    ['Overnight feed', feed],
    ['Caregiver on shift', onShift ? onShift.name : 'No one checked in'],
  ]

  const age = patient.age
  const info: [string, string][] = [
    ['Condition', patient.summary],
    ['Date of birth', `${formatDate(fromDateInput(patientMedicalInfo.dateOfBirth))} (age ${age})`],
    ['Weight', patientMedicalInfo.weight],
    ['Allergies', patientMedicalInfo.allergies],
    ['Hospital', patientMedicalInfo.hospital],
  ]

  return (
    <Page>
      <Header title="Emergency" back />
      <main className="px-4 pt-2">
        {/* 911 */}
        <a
          href="tel:911"
          className="flex min-h-16 items-center justify-center gap-2 rounded-[20px] bg-[#d6336c] text-xl font-bold text-white active:scale-[0.98]"
        >
          📞 Call 911
        </a>
        <p className="mt-2 px-1 text-xs text-cocoa">
          Tell them: <b className="text-brown">{patient.name}, {age}, has cystic fibrosis and a G-tube.</b> Give the home
          address and stay on the line.
        </p>

        {/* Live status from the logs */}
        <Section title="Right now">
          <Card className="space-y-2 text-[13px]">
            {status.map(([label, value]) => (
              <div key={label}>
                <p className="text-xs font-semibold text-cocoa">{label}</p>
                <p className="font-semibold">{value}</p>
              </div>
            ))}
          </Card>
        </Section>

        {/* Patient info */}
        <Section title={`About ${patient.name}`}>
          <Card className="space-y-2 text-[13px]">
            {info.map(([label, value]) => (
              <div key={label} className="flex gap-3">
                <span className="w-24 shrink-0 text-xs font-semibold text-cocoa">{label}</span>
                <span className={cx('flex-1', label === 'Allergies' && 'font-bold')}>{value}</span>
              </div>
            ))}
            <div className="flex gap-3">
              <span className="w-24 shrink-0 text-xs font-semibold text-cocoa">Daily care</span>
              <ul className="flex-1 space-y-0.5">
                {devices.map((d) => {
                  const times = d.sessions
                    .filter((s) => s.recurrence === 'daily' && s.scheduledTime)
                    .map((s) => formatScheduled(s.scheduledTime || ''))
                  return (
                    <li key={d.id}>
                      <b>{d.name}</b> <span className="text-cocoa">· {times.join(', ')}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          </Card>
        </Section>

        {/* Contacts */}
        <Section title="Contacts">
          <Card className="p-0">
            {emergencyContacts.map((c) => (
              <a
                key={c.name}
                href={telHref(c.phone)}
                className="flex min-h-14 items-center gap-3 border-t border-lilac px-4 py-2.5 first:border-t-0 active:bg-lilac"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{c.name}</p>
                  <p className="text-xs text-cocoa">
                    {c.role}
                    {c.note && ` · ${c.note}`}
                  </p>
                </div>
                <span className="shrink-0 text-right">
                  <span className="block text-[13px] font-semibold">{c.phone}</span>
                  <span className="text-xs font-semibold text-teal">Call ›</span>
                </span>
              </a>
            ))}
          </Card>
        </Section>

        {/* Procedures */}
        <Section title="What to do">
          <div className="space-y-2">
            {emergencyProcedures.map((p) => (
              <ProcedureCard
                key={p.id}
                procedure={p}
                open={openId === p.id}
                onToggle={() => setOpenId(openId === p.id ? null : p.id)}
              />
            ))}
          </div>
        </Section>

        <p className="mt-4 px-1 text-xs text-cocoa">
          Care plan status: <b>{patientMedicalInfo.carePlanReviewed}</b>. These steps are a general template. Follow{' '}
          {patient.name}'s care team's instructions when they differ.
        </p>
      </main>
    </Page>
  )
}

function ProcedureCard({
  procedure: p,
  open,
  onToggle,
}: {
  procedure: EmergencyProcedure
  open: boolean
  onToggle: () => void
}) {
  const contact = emergencyContacts.find((c) => c.name === p.thenCall)
  return (
    <div className="rounded-[18px] bg-white">
      <button onClick={onToggle} aria-expanded={open} className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">{p.title}</p>
          <p className="text-xs text-cocoa">{p.when}</p>
        </div>
        <span className="w-3 text-center text-cocoa">{open ? '⌄' : '›'}</span>
      </button>
      {open && (
        <div className="space-y-3 border-t border-lilac px-4 py-3 text-[13px]">
          {p.call911.length > 0 && (
            <div className="rounded-xl bg-[#d6336c] px-3 py-2 text-white">
              <p className="font-bold">Call 911 now if:</p>
              <ul className="mt-0.5 space-y-0.5">
                {p.call911.map((sign) => (
                  <li key={sign}>• {sign}</li>
                ))}
              </ul>
            </div>
          )}
          <ol className="space-y-1.5">
            {p.steps.map((step, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal text-[11px] font-bold text-white">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          {contact && (
            <a
              href={telHref(contact.phone)}
              className="flex min-h-11 items-center justify-center rounded-full border-[1.5px] border-aqua font-semibold"
            >
              Then call {contact.name} · {contact.phone}
            </a>
          )}
        </div>
      )}
    </div>
  )
}
