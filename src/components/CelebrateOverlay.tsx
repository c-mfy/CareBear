import { useEffect, useState } from 'react'
import proud from '../assets/kuma/proud.png'
import { onCelebration, type Celebration } from '../lib/welcome'

const SHOW_MS = 3000 // whole scene, including the fade out
const FADE_MS = 350

/**
 * Short scene after "Mark as complete": proud Kuma hops and sways, with what was logged.
 * Fades to the page underneath after 3 seconds. Tap anywhere to skip.
 */
export function CelebrateOverlay() {
  const [scene, setScene] = useState<Celebration | null>(null)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    return onCelebration((c) => {
      setLeaving(false)
      setScene(c)
    })
  }, [])

  useEffect(() => {
    if (scene === null) {
      return
    }
    let fadeDelay = SHOW_MS - FADE_MS
    if (leaving) {
      fadeDelay = 0
    }
    const fade = setTimeout(() => setLeaving(true), fadeDelay)
    const done = setTimeout(() => setScene(null), fadeDelay + FADE_MS)
    return () => {
      clearTimeout(fade)
      clearTimeout(done)
    }
  }, [scene, leaving])

  if (scene === null) {
    return null
  }

  let fadeClass = 'welcome-in'
  if (leaving) {
    fadeClass = 'welcome-out'
  }

  return (
    <div
      role="status"
      aria-live="polite"
      onClick={() => setLeaving(true)}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-blossom px-8 text-center ${fadeClass}`}
    >
      <div className="relative">
        <span className="welcome-sparkle absolute -top-3 -left-5 text-2xl text-sea">✦</span>
        <span className="welcome-sparkle absolute top-6 -right-7 text-xl text-rose [animation-delay:0.25s]">✦</span>
        <img src={proud} alt="" draggable={false} className="celebrate-kuma relative z-10 w-[170px] select-none" />
      </div>
      <h1 className="welcome-text mt-6 font-display text-[28px] leading-tight font-bold">{scene.title}</h1>
      <p className="celebrate-sub mt-2 text-base text-cocoa">{scene.subtitle}</p>
    </div>
  )
}
