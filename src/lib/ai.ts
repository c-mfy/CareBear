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

interface RecentBody {
  task: 'recent'
  hours: number
  entries: { caregiver: string; device?: string; session?: string; time: string; done: string; notes: string }[]
}

type Body = SuggestBody | SummaryBody | RecentBody

function buildPrompt(body: Body): string {
  if (body.task === 'recent') {
    return [
      `You summarize home care for a medically complex child so the next caregiver can catch up fast.`,
      `Everything logged in the past ${body.hours} hours, by any caregiver: ${JSON.stringify(body.entries)}.`,
      `Write 3 to 5 short, plain bullets. Put anything missed, abnormal, or noted first. Mention who did it when useful.`,
      `Do not invent anything not in the entries.`,
      `Respond ONLY with JSON: {"bullets":["..."]}`,
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
  if (body.task !== 'suggest' && body.task !== 'summary' && body.task !== 'recent') {
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
  const parsed = extractJson(data)
  if (parsed === null) {
    // Log what came back so it shows in Vercel → Logs
    console.error('Model did not return JSON:', JSON.stringify(data).slice(0, 1000))
    return Response.json({ error: 'Model did not return JSON' }, { status: 502 })
  }
  return Response.json(parsed)
}

/**
 * Pull a JSON object out of Gemini's reply. Handles:
 * - text split across several parts, or "thought" parts before the answer
 * - ```json code fences
 * - extra words before/after the object
 */
function extractJson(data: unknown): unknown {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parts: any[] = (data as any)?.candidates?.[0]?.content?.parts || []
  const text = parts
    .filter((p) => typeof p?.text === 'string' && p.thought !== true)
    .map((p) => p.text)
    .join('')
  if (!text) {
    return null
  }
  try {
    return JSON.parse(text)
  } catch {
    // fall through to the cleanup below
  }
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end <= start) {
    return null
  }
  try {
    return JSON.parse(text.slice(start, end + 1))
  } catch {
    return null
  }
}