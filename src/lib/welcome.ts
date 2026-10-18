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
