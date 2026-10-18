import { useEffect, useState } from 'react'
import kumaWave from '../assets/kuma/wave.png'
import { onWelcome } from '../lib/welcome'

const SHOW_MS = 5000 // whole scene, including the fade out
const FADE_MS = 400

/**
 * Full-screen "Welcome, <name>." scene after checking in: waving Kuma hops and sways,
 * then everything fades away to the page underneath. Tap anywhere to skip.
 */
export function WelcomeOverlay() {
  const [name, setName] = useState<string | null>(null)
  const [leaving, setLeaving] = useState(false)

  // Start when the check-in page calls showWelcome(name)
  useEffect(() => {
    return onWelcome((n) => {
      setLeaving(false)
      setName(n)
    })
  }, [])

  // After SHOW_MS (or a tap), fade out, then remove
  useEffect(() => {
    if (name === null) {
      return
    }
    let fadeDelay = SHOW_MS - FADE_MS
    if (leaving) {
      fadeDelay = 0
    }
    const fade = setTimeout(() => setLeaving(true), fadeDelay)
    const done = setTimeout(() => setName(null), fadeDelay + FADE_MS)
    return () => {
      clearTimeout(fade)
      clearTimeout(done)
    }
  }, [name, leaving])

  if (name === null) {
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
        {/* sparkles around Kuma */}
        <span className="welcome-sparkle absolute -top-2 -left-6 text-2xl text-rose">✦</span>
        <span className="welcome-sparkle absolute top-10 -right-8 text-xl text-sea [animation-delay:0.3s]">✦</span>
        <span className="welcome-sparkle absolute bottom-16 -left-10 text-lg text-sea [animation-delay:0.6s]">✦</span>

        <img src={kumaWave} alt="" draggable={false} className="welcome-kuma relative z-10 w-[210px] select-none" />
      </div>

      <h1 className="welcome-text mt-8 font-display text-[28px] leading-tight font-bold">
        Welcome, <span className="text-sea">{name}</span>.
      </h1>
      <p className="welcome-hint mt-3 text-sm text-cocoa/70">Tap anywhere to continue</p>
    </div>
  )
}