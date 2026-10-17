import { useEffect, useState } from 'react'

/** Current time, refreshed every `intervalMs` so time-based UI (overdue tasks) updates on its own. */
export function useNow(intervalMs: number = 60000): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])
  return now
}
