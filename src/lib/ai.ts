// Vercel serverless function: POST /api/ai
// Holds the Gemini API key server-side so it never ships in the React bundle.
// Env vars (set in Vercel project settings): GEMINI_API_KEY, optional GEMINI_MODEL.
// Stores nothing — it only forwards a prompt and returns JSON.

declare const process: { env: Record<string, string | undefined> }

interface SuggestBody {
  task: 'suggest'
  device: string
  session: string
  fields: { id: string; label: string; type: string; unit?: string }[]
  recent: Record<string, unknown>[]
}

interface SummaryBody {
  task: 'summary'
  caregiver: string
  entries: { device?: string; session?: string; time: string; done: string; notes: string }[]
  overallNotes: string
}

interface DoctorBody {
  task: 'doctor'
  report: Record<string, unknown>
}

interface RecentBody {
  task: 'recent'
  hours: number
  entries: { caregiver: string; device?: string; session?: string; time: string; done: string; notes: string }[]
  handoffs: { caregiver: string; shift: string; notes: string; flaggedAbnormal: boolean }[]
  overdue: string[]
  upcoming: string[]
}

type Body = SuggestBody | SummaryBody | DoctorBody | RecentBody

function buildPrompt(body: Body): string {
  if (body.task === 'recent') {
    return [
      `You summarize home care for a medically complex child so the next caregiver can catch up fast.`,
      `Everything logged in the past ${body.hours} hours, by any caregiver: ${JSON.stringify(body.entries)}.`,
      `Shift handoffs in that time: ${JSON.stringify(body.handoffs)}.`,
      `Missed or late treatments: ${JSON.stringify(body.overdue)}. Still due today: ${JSON.stringify(body.upcoming)}.`,
      `Write 3 to 5 rows for a phone screen. Each row has a "kind", a bold "title" (at most 6 words) and a small "detail" line (at most 8 words).`,
      `Kinds: "missed" = missed, late or flagged abnormal; "done" = care that was completed (group routine care into ONE row, e.g. title "All 6 treatments on time", detail "Vest, nebulizer, Trikafta, feeds"); "handoff" = a shift handoff (title "Nurse Alex handed off", detail "7:05 PM · no flags"); "note" = something a caregiver noted (title = the observation, detail "Noted by Mom · 7:40 PM"); "quiet" = nothing was logged; "next" = what is due next (title "Next up: <device>", detail "<session> at <time>").`,
      `Order: missed first, then done, handoff, note, and "next" last. Use at most one "missed" row unless a visit was flagged. Mention who did it when useful.`,
      `Do not invent anything not in the data.`,
      `Respond ONLY with JSON: {"rows":[{"kind":"...","title":"...","detail":"..."}]}`,
    ].join('\n')
  }
  if (body.task === 'doctor') {
    return [
      `You write the summary at the top of a home care report for the pediatric doctor of a medically complex child, covering home care since the last visit.`,
      `Home care data (already computed from caregiver logs, including a day-by-day series): ${JSON.stringify(body.report)}.`,
      `Write a brief, readable summary a busy doctor can take in at a glance. Detailed tables and charts follow it, so do NOT list every event.`,
      `"overview": 2 to 3 plain sentences on how home care went overall in this period.`,
      `"trends": 3 to 5 short bullets on patterns across the days: what is consistent, what is getting better or worse, what recurs (for example the same dose being late, feeds falling short on certain nights, symptoms clustering on the same days). Lead with anything clinically concerning. Mention dates or counts only when they make the pattern clear.`,
      `Do not invent symptoms, doses, or numbers that are not in the data. Do not diagnose or recommend treatment.`,
      `Respond ONLY with JSON: {"overview":"...","trends":["..."]}`,
    ].join('\n')
  }
  if (body.task === 'suggest') {
    return [
      `You help a home caregiver log a medical device session quickly.`,
      `Device: ${body.device}. Session: ${body.session}.`,
      `Fields (id, label, type): ${JSON.stringify(body.fields)}.`,
      `Most recent past entries for this session, newest first: ${JSON.stringify(body.recent)}.`,
      `Return 2 or 3 likely ways this session went today, based on past entries.`,
      `Respond ONLY with JSON: {"suggestions":[{"label":"short 2-5 word label","values":{"<fieldId>": true|false|number|"note text"}}]}`,
      `Use only the field ids given. "check" fields are booleans, "number" fields are numbers, "notes" is a short string.`,
    ].join('\n')
  }
  return [
    `You write shift handoff summaries for caregivers of a medically complex child.`,
    `Outgoing caregiver: ${body.caregiver}.`,
    `Logged entries this shift: ${JSON.stringify(body.entries)}.`,
    `Caregiver's overall notes: ${JSON.stringify(body.overallNotes)}.`,
    `Write 3 to 5 short, plain bullets for the next caregiver. Put anything missed, abnormal, or noted first.`,
    `Do not invent anything not in the entries or notes.`,
    `Respond ONLY with JSON: {"bullets":["..."]}`,
  ].join('\n')
}

export async function POST(request: Request): Promise<Response> {
  const key = process.env.GEMINI_API_KEY
  if (!key) {
    return Response.json({ error: 'GEMINI_API_KEY not set' }, { status: 500 })
  }
  // trim: a pasted env value with a stray space, newline or quotes otherwise turns into a 404 "model not found"
  const model = (process.env.GEMINI_MODEL || '').trim().replace(/^["']|["']$/g, '') || 'gemini-2.5-flash'

  let body: Body
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Bad JSON' }, { status: 400 })
  }
  if (!['suggest', 'summary', 'doctor', 'recent'].includes(body.task)) {
    return Response.json({ error: 'Unknown task' }, { status: 400 })
  }

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildPrompt(body) }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  })
  if (!res.ok) {
    // Pass Google's reason along (e.g. which quota was hit, or which model name wasn't found)
    let reason = ''
    try {
      const err = await res.json()
      reason = String(err?.error?.message || '').slice(0, 300)
    } catch {
      // no JSON body
    }
    console.error(`Gemini error ${res.status} (model ${model}):`, reason)
    return Response.json({ error: `Gemini error ${res.status} (model "${model}"): ${reason}` }, { status: 502 })
  }

  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  try {
    return Response.json(JSON.parse(text))
  } catch {
    return Response.json({ error: 'Model did not return JSON' }, { status: 502 })
  }
}