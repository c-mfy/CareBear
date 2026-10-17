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
      `Write 3 to 5 short, plain bullets. Put anything missed, late, flagged abnormal, or noted first. Mention who did it when useful.`,
      `Group routine care into one bullet instead of listing every entry. End with what is due next, if anything.`,
      `Do not invent anything not in the data.`,
      `Respond ONLY with JSON: {"bullets":["..."]}`,
    ].join('\n')
  }
  if (body.task === 'doctor') {
    return [
      `You write a care report for the pediatric doctor of a medically complex child, covering home care since the last visit.`,
      `Home care data (already computed from caregiver logs): ${JSON.stringify(body.report)}.`,
      `Write these sections, in this order: "Summary", "Treatment adherence", "Symptoms & observations", "Measurements & equipment", "Questions for the doctor".`,
      `Each section has 2 to 6 short, clinical, factual bullets. Lead with anything missed, abnormal, or recurring. Include dates and counts.`,
      `"Questions for the doctor" suggests questions the family could ask, based only on the data.`,
      `Do not invent symptoms, doses, or numbers that are not in the data. Do not diagnose.`,
      `Respond ONLY with JSON: {"sections":[{"title":"...","bullets":["..."]}]}`,
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
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

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
    return Response.json({ error: `Gemini error ${res.status}` }, { status: 502 })
  }

  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  try {
    return Response.json(JSON.parse(text))
  } catch {
    return Response.json({ error: 'Model did not return JSON' }, { status: 502 })
  }
}
