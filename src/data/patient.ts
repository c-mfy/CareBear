import type { Device, Patient } from '../types'

// HARDCODED: mock patient for the demo (replaces onboarding).
export const patient: Patient = {
  name: 'Maya',
  nickname: 'Maya',
  age: 11,
  summary:
    'Cystic fibrosis. Takes Trikafta. Breathing treatments + vest every morning and evening. Overnight G-tube feeds.',
  lastGtubeButtonChange: '2026-08-01', // HARDCODED placeholder date
}

// HARDCODED: id written into the door NFC tag URL (/checkin?tag=<id>).
// Check-in only works with this id, so a shift can only start at the home (EVV).
export const DOOR_TAG_ID = 'maya-door-7k2q'

const notes = { id: 'notes', label: 'Notes', type: 'notes' as const }

// HARDCODED: device + session definitions from the tag sheet.
// Times marked "GUESS" were not in the sheet — edit them.
export const devices: Device[] = [
  {
    id: 'vest',
    name: 'Vest',
    model: 'Electromed SmartVest SQL',
    sessions: [
      {
        id: 'morning',
        label: 'Morning session',
        startHour: 0,
        endHour: 12,
        scheduledTime: '07:15', // GUESS
        recurrence: 'daily',
        fields: [{ id: 'minutes', label: 'Minutes', type: 'number', unit: 'min' }, notes],
      },
      {
        id: 'evening',
        label: 'Evening session',
        startHour: 12,
        endHour: 24,
        scheduledTime: '18:45', // GUESS
        recurrence: 'daily',
        fields: [{ id: 'minutes', label: 'Minutes', type: 'number', unit: 'min' }, notes],
      },
    ],
  },
  {
    id: 'nebulizer',
    name: 'Nebulizer',
    model: 'PARI Vios 310F35-LCS',
    sessions: [
      {
        id: 'morning',
        label: 'Morning session',
        startHour: 0,
        endHour: 12,
        scheduledTime: '06:45',
        recurrence: 'daily',
        fields: [
          { id: 'albuterol', label: 'Albuterol given', type: 'check' },
          { id: 'saline', label: '7% saline given', type: 'check' },
          { id: 'rinsed', label: 'Parts rinsed', type: 'check' },
          notes,
        ],
      },
      {
        id: 'evening',
        label: 'Evening session',
        startHour: 12,
        endHour: 24,
        scheduledTime: '18:15',
        recurrence: 'daily',
        fields: [
          { id: 'albuterol', label: 'Albuterol given', type: 'check' },
          { id: 'saline', label: '7% saline given', type: 'check' },
          { id: 'rinsed', label: 'Parts rinsed', type: 'check' },
          { id: 'disinfected', label: 'Parts disinfected', type: 'check' },
          notes,
        ],
      },
    ],
  },
  {
    id: 'feeding-pump',
    name: 'Feeding pump',
    model: 'Kangaroo Joey',
    sessions: [
      {
        id: 'morning-stop',
        label: 'Morning: stop feed',
        startHour: 0,
        endHour: 12,
        scheduledTime: '06:30', // GUESS
        recurrence: 'daily',
        fields: [
          { id: 'stopped', label: 'Feed stopped', type: 'check' },
          { id: 'flushed', label: 'Tube flushed', type: 'check' },
          { id: 'infused', label: 'Total infused', type: 'number', unit: 'mL' },
          notes,
        ],
      },
      {
        // Agreed: bedtime is the only later session, so it covers noon onward.
        id: 'bedtime-start',
        label: 'Bedtime: start feed',
        startHour: 12,
        endHour: 24,
        scheduledTime: '21:00', // GUESS
        recurrence: 'daily',
        fields: [
          { id: 'flushed', label: 'Tube flushed', type: 'check' },
          { id: 'freshSet', label: 'Fresh set and bag used', type: 'check' },
          { id: 'rate', label: 'Pump rate', type: 'number', unit: 'mL/hr' },
          { id: 'loaded', label: 'Total volume loaded', type: 'number', unit: 'mL' },
          { id: 'noAlarm', label: 'Pump running with no alarm', type: 'check' },
          notes,
        ],
      },
      {
        id: 'gtube-quarterly',
        label: 'Every 3 months: G-tube button',
        startHour: 0,
        endHour: 0, // never auto-picked
        recurrence: 'quarterly',
        fields: [{ id: 'replaced', label: 'G-tube button replaced', type: 'check' }, notes],
      },
    ],
  },
  {
    id: 'trikafta',
    name: 'Trikafta',
    model: 'Pill bottle',
    medication: true,
    sessions: [
      {
        id: 'morning',
        label: 'Morning dose',
        startHour: 0,
        endHour: 12,
        scheduledTime: '08:00', // GUESS
        recurrence: 'daily',
        fields: [
          { id: 'given', label: 'Dose given', type: 'check' },
          { id: 'withFat', label: 'Taken with fat-containing food', type: 'check' },
          notes,
        ],
      },
      {
        id: 'evening',
        label: 'Evening dose',
        startHour: 12,
        endHour: 24,
        scheduledTime: '19:30', // GUESS
        recurrence: 'daily',
        fields: [
          { id: 'given', label: 'Dose given', type: 'check' },
          { id: 'withFat', label: 'Taken with fat-containing food', type: 'check' },
          notes,
        ],
      },
    ],
  },
]

export function getDevice(id: string): Device | undefined {
  return devices.find((d) => d.id === id)
}

// Colors handed out to newly added caregivers, in order (calendar colors).
export const caregiverColors = ['#f392ba', '#1bb3b0', '#755339', '#6ebec1', '#f7c2dd', '#b9f1ee']
