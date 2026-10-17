# Care Handoff — Hack Like W@CC 2026

Tap-to-log care ledger for medically complex kids. Caregivers tap NFC stickers on home medical devices to log care. At the end of a shift they tap **Hand off**, which writes a summary for the next caregiver.

Stack: React + Vite + TypeScript + Tailwind v4, FullCalendar (week view), one Vercel function for Gemini.

---

## Run it locally

1. `npm install`
2. `npm run dev`
3. Open the URL it prints. Use your browser's phone emulator at about 390px wide.

`npm run dev` doesn't run the `/api` function, so AI features use the mock text locally. That's expected. To test real AI locally, run `npx vercel dev` instead (see "Set up AI" below).

---

## How the app works

| URL | What it is | Opened by |
|---|---|---|
| `/` | Home: summary, tasks, calendar, history, team | Anyone |
| `/checkin?tag=<DOOR_TAG_ID>` | "Who's logging?" picker; add a caregiver by name. Without the tag id it only says "tap the door tag" (EVV) | **Door tag** |
| `/doctor-note` | Detailed report of everything since the last doctor's visit, with AI write-up, copy, and print | Home header "Doctor's note" |
| `/log/vest` | Log vest session | **Vest tag** |
| `/log/nebulizer` | Log nebulizer session | **Nebulizer tag** |
| `/log/feeding-pump` | Log feeding pump session | **Feeding pump tag** |
| `/log/trikafta` | Log Trikafta dose | **Pill bottle tag** |
| `/handoff` | Review shift, add notes, generate summary, check out | Header "Hand off" button |

Rules:
- One caregiver is on shift at a time.
- **EVV:** the door tag both starts and ends a shift. Tapping it with nobody on shift checks in; tapping it while someone is on shift opens their handoff, and **Hand off & check out** only works after that tap. There is no check-in or check-out button in the app. Both taps are saved on the handoff. The handoff can be written before the tap; the draft is kept until checkout.
- Tapping a device tag while nobody is checked in sends you to check-in, then straight back to that device.
- The session is auto-picked by time of day, and you can change it with the session buttons:
  - before noon: morning
  - noon onward: evening
  - pump: noon onward is bedtime start
  - the every-3-months G-tube session is never auto-picked
- **Mark as complete** does three things: checks the item off today's to-do list, stores the notes for the handoff, and adds the entry to the calendar at the current time in the caregiver's color.
- To-do rows link to their log page, so you can test without NFC.

---

## What's HARDCODED (change these)

| What | File |
|---|---|
| Theme: 4 colors + 2 fonts (placeholders) | `src/index.css` → `@theme` block |
| Font loading (none yet) | `index.html` → add Google Fonts `<link>` |
| Patient (Maya) info | `src/data/patient.ts` → `patient` |
| Devices, sessions, fields (from tag sheet) | `src/data/patient.ts` → `devices` |
| **Guessed times** (not in tag sheet): vest 7:15/6:45, pump stop 6:30, pump start 9:00 PM, Trikafta 8:00/7:30 | `src/data/patient.ts`, lines marked `// GUESS` |
| Last G-tube button change date (`2026-08-01`) | `src/data/patient.ts` → `lastGtubeButtonChange` |
| Caregiver colors for new caregivers | `src/data/patient.ts` → `caregiverColors` |
| Seed caregivers (Mom, Nurse Alex, Dad) | `src/data/seed.ts` → `seedCaregivers` |
| Seed history: 3 days of 12-hr shifts (7a–7p Nurse Alex, 7p–7a Mom) | `src/data/seed.ts` → `makeSeed` |
| Seed values and sample notes | `src/data/seed.ts` → `typicalNumbers`, `sampleNotes` |
| Mock AI text, used when the API fails | `src/lib/ai.ts` → `mockSuggestions`, `mockSummary` |
| AI prompts | `api/ai.ts` → `buildPrompt` |

All data is stored in **this browser's localStorage** (key `care-handoff-v1`). There's a **Reset demo data** button at the bottom of the home page.

---

## What YOU need to add

Do these in order.

1. **Push to GitHub** and import the repo in Vercel. The framework preset is Vite, and the defaults are fine. `vercel.json` already makes deep links like `/log/vest` work.
2. **Get a free Gemini key** at https://aistudio.google.com/apikey.
3. **In Vercel, go to Project → Settings → Environment Variables** and add `GEMINI_API_KEY`. You can optionally add `GEMINI_MODEL`; check AI Studio for the current model name. Then redeploy.
4. **Write the NFC tags.** Use an app like NFC Tools on iPhone and write a **URL record** to each sticker:
   - Door: `https://<your-app>.vercel.app/checkin?tag=maya-door-7k2q` (must match `DOOR_TAG_ID` in `src/data/patient.ts`)
   - Vest: `https://<your-app>.vercel.app/log/vest`
   - Nebulizer: `https://<your-app>.vercel.app/log/nebulizer`
   - Feeding pump: `https://<your-app>.vercel.app/log/feeding-pump`
   - Pill bottle: `https://<your-app>.vercel.app/log/trikafta`
5. **Pick your palette and fonts** and replace the values in `src/index.css`.
6. **Fix the guessed times** in `src/data/patient.ts` if you want them to be different.

---

## Demo-day notes

- Use **one iPhone, in Safari, not in Private Browsing**. Don't use an "Add to Home Screen" copy, because it has separate storage from the Safari tab the tags open.
- If AI is slow or offline, the app silently uses the mock text after 8 seconds.
- Press **Reset demo data** between judges.

---

## Folder map

```
api/ai.ts                 Vercel function: forwards prompts to Gemini, key stays server-side
src/
  App.tsx                 Routes (= NFC URLs)
  index.css               Theme tokens (colors, fonts)
  types.ts                Data shapes
  data/patient.ts         Mock patient + devices/sessions/fields
  data/seed.ts            Seed caregivers, logs, handoffs
  lib/store.tsx           App state + actions (check in, log, hand off, reset)
  lib/storage.ts          localStorage load/save
  lib/sessions.ts         Time-of-day session picking, due dates
  lib/tasks.ts            Builds today's to-do list from logs
  lib/ai.ts               Calls /api/ai with mock fallback
  lib/format.ts           Text formatting for logs/times
  components/             Header, SummaryCard, TaskList, CareCalendar, HistoryList,
                          CaregiverPicker, FieldInput, ui (Button/Card/Section)
  pages/                  HomePage, CheckInPage, LogPage, HandoffPage
```
