// Tiny bridge so the check-in page can trigger the welcome animation, which lives above all pages
// (the check-in page navigates away right after, so the animation can't live inside it).

const EVENT = 'care-welcome'

/** Show "Welcome, <name>." with Kuma jumping, over whatever page comes next. */
export function showWelcome(name: string) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: name }))
}

/** Listen for showWelcome calls. Returns a function that stops listening. */
export function onWelcome(handler: (name: string) => void): () => void {
  function listener(e: Event) {
    handler((e as CustomEvent<string>).detail)
  }
  window.addEventListener(EVENT, listener)
  return () => window.removeEventListener(EVENT, listener)
}

// ---------- Task-complete celebration ----------

const CELEBRATE_EVENT = 'care-celebrate'

export interface Celebration {
  title: string // e.g. "Nebulizer done!"
  subtitle: string // e.g. "Logged at 6:20 PM · 5 of 8 today"
}

/** Show Kuma's short "done!" scene over whatever page comes next. */
export function showCelebration(c: Celebration) {
  window.dispatchEvent(new CustomEvent(CELEBRATE_EVENT, { detail: c }))
}

/** Listen for showCelebration calls. Returns a function that stops listening. */
export function onCelebration(handler: (c: Celebration) => void): () => void {
  function listener(e: Event) {
    handler((e as CustomEvent<Celebration>).detail)
  }
  window.addEventListener(CELEBRATE_EVENT, listener)
  return () => window.removeEventListener(CELEBRATE_EVENT, listener)
}
