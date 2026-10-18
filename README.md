# CareBear

**Tap-to-verify home care for medically complex kids.** CareBear replaces whiteboard and group-text handoffs with NFC stickers on the front door and on each medical device. Caregivers tap to check in, tap to log each treatment, and tap to check out, and the next caregiver gets an AI briefing of everything that happened.

Built for **Hack Like W@CC 2026**.

**Live demo:** [carebearhealth.vercel.app](https://carebearhealth.vercel.app)

---

## Features

- **Tap-to-verify visits (EVV).** The NFC tag on the front door is the only way to start or end a shift, so every visit is anchored to the patient's home for Medicaid Electronic Visit Verification. Each visit records who, when, and whether both ends were verified at the door.
- **Tap-to-log care.** Tags on the vest, nebulizer, feeding pump, and pill bottle open that device's checklist for the right session (morning, evening, or bedtime), with notes and AI quick-fill suggestions.
- **Safety rules.** Overdue alerts once a treatment is 30+ minutes late, a double-dose guard that blocks repeat medication until the caregiver confirms it's a separate dose, and automatic "abnormal" flags on shifts where care was missed or late. Caregivers can flag a shift by hand too.
- **AI briefings.** A "last 12 hours" recap across every caregiver on the home screen, plus an AI summary at each handoff.
- **Doctor's note.** An AI trend summary since the last visit, details computed from the logs, four trend charts, and a PDF report with appendices and a physician sign-off.
- **EVV timesheet.** Weekly hours per caregiver from door-tag check-in to check-out, exported as CSV or PDF with the federal EVV fields.
- **Emergency page.** One-tap 911, a live status (last dose, whether the feed is running), tap-to-call contacts, and step-by-step procedures.
- **Care calendar and history.** A week view of every entry in each caregiver's color, unfinished tasks in gray, and a history of past visits with their summaries and flags.

The demo patient is **Maya, 11, with cystic fibrosis**: twice-daily vest therapy, nebulized albuterol and saline, Trikafta, and overnight G-tube feeds.

---

## How it works

### NFC tags are just links

iPhone Safari can't read NFC from a web page, but iOS opens any URL stored on a tag. So each tag holds a standard NDEF URL record that opens a page of the app, with no app to install.

| Tag | URL | Opens |
|---|---|---|
| Front door | `/checkin?tag=maya-door-7k2q` | Check in, or check out if someone is on shift |
| Vest | `/log/vest` | Vest session |
| Nebulizer | `/log/nebulizer` | Nebulizer session |
| Feeding pump | `/log/feeding-pump` | Stop feed (morning) or start feed (bedtime) |
| Pill bottle | `/log/trikafta` | Trikafta dose |

Check-in only works when the URL carries the door tag's ID (`DOOR_TAG_ID` in `src/data/patient.ts`), and the app has no check-in button, so a shift can only start at the home.

### Other pages

| URL | Page |
|---|---|
| `/` | Home: 12-hour recap, overdue alerts, today's care, calendar, history, care team |
| `/handoff` | Review the shift, write notes, generate the summary, check out |
| `/doctor-note` | Doctor's note, charts, and PDF export |
| `/timesheet` | Weekly EVV timesheet with CSV and PDF export |
| `/history` | Every past visit |
| `/emergency` | Emergency info and procedures |

### The rules engine computes; the AI only summarizes

Every number is calculated in TypeScript: overdue status, on-time / late / missed, adherence, feed volumes, timesheet hours. One function (`sessionOccurrences` in `src/lib/tasks.ts`) decides whether each scheduled session was on time, late, or missed, and the alerts, shift flags, and charts all use it. Gemini only receives these pre-computed values and turns them into readable summaries.

### AI layer

The app sends data to its own `/api/ai` endpoint, a Vercel serverless function that holds the Gemini API key and calls **Gemini 2.5 Flash** in JSON mode. It handles four tasks: quick-fill suggestions, handoff summaries, the 12-hour recap, and the doctor's-note trends.

Every AI feature has a computed fallback, so the app keeps working if Gemini is slow, rate-limited, or unavailable. Summaries are labeled **AI** or **Auto** so caregivers know which they're reading, and AI results are cached until the underlying data changes.

### Data

All data (caregivers, shifts, care logs, visits) is stored in the browser's localStorage, so the demo runs on a single shared phone with no accounts or backend database. Demo history is generated relative to the current time: five days of morning, evening, and bedtime visits, including a missed vest session, a late Trikafta dose, and a sick day flagged by the caregivers.

---

## Tech stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, React Router
- **Calendar:** FullCalendar
- **Charts:** Chart.js
- **PDF export:** jsPDF, jspdf-autotable
- **AI:** Google Gemini 2.5 Flash (REST API) via a Vercel serverless function
- **Hosting:** Vercel
- **Hardware:** NFC stickers with NDEF URL records, written with NFC Tools

---

## Running locally

```bash
npm install
npm run dev
```

Open the printed URL in your browser's phone emulator (about 390px wide). To check in without a tag, open `http://localhost:5173/checkin?tag=maya-door-7k2q`; open the same URL again to check out.

`npm run dev` doesn't run the `/api` function, so AI features show their computed fallback. To use Gemini locally, run `npx vercel dev` with the environment variables below.

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey) |
| `GEMINI_MODEL` | No | Model ID, defaults to `gemini-2.5-flash` |

### Deploying

Import the repo into Vercel with the Vite preset, add the environment variables, and deploy. `vercel.json` routes every path to the app, so tag URLs like `/log/vest` work as direct links.

---

## Project structure

```
api/
  ai.ts                Vercel function: builds prompts and calls Gemini (key stays server-side)
src/
  App.tsx              Routes (the NFC tag URLs)
  types.ts             Data shapes
  data/
    patient.ts         Patient, devices, sessions, checklist fields, door tag ID
    seed.ts            Generated demo history
    emergency.ts       Emergency contacts and procedures
  lib/
    store.tsx          App state and actions (check in, log, hand off, ...)
    storage.ts         localStorage load/save and AI result caching
    tasks.ts           To-do list, overdue rules, on-time/late/missed
    dose-check.ts      Double-dose guard
    recent.ts          Last-12-hours recap
    doctor.ts          Doctor's note report and summary
    trends.ts          Day-by-day series for charts
    charts.ts          Chart.js configs (page and PDF)
    timesheet.ts       EVV timesheet and CSV
    pdf-kit.ts         Shared PDF layout
    doctor-pdf.ts      Doctor's note PDF
    timesheet-pdf.ts   Timesheet PDF
    ai-client.ts       Calls /api/ai with fallbacks
  components/          Calendar, charts, history, care team, summary card, overlays, UI
  pages/               Home, check-in, log, handoff, doctor's note, timesheet, history, emergency
```

---

## Demo tips

- Use **one iPhone in Safari**, not Private Browsing and not an "Add to Home Screen" copy, since those have separate storage from the tab the tags open.
- **Reset demo data** at the bottom of the home page regenerates the history up to the current time.
- **Exit without handing off** on the shift report page ends a test shift without recording a visit.

---

## Limitations and next steps

- **Single device.** Data lives on one phone. Next: a hosted database with real-time sync so a nurse's tap shows up on a parent's phone.
- **Static tag URLs.** A copied door URL works anywhere. Next: NTAG 424 DNA tags, which add a fresh encrypted code to every tap for server-side verification.
- **EVV and EHR integration** with state aggregators such as Sandata and HHAeXchange.
- **Voice dictation** for hands-free notes, and **supply tracking** for feeding bags and other consumables.
- **Emergency procedures** are a general template and would be replaced with each patient's care plan.

---

## Team

San Nguyen · Lydia He · Xinyu Su · Emma Xuan
