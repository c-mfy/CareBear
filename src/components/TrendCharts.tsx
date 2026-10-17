import { useEffect, useRef, useState } from 'react'
import type { Chart } from 'chart.js'
import { loadChartJs, type ChartSpec } from '../lib/charts'
import { Card } from './ui'

/** The doctor's-note trend charts, drawn on the page (same specs the PDF uses). */
export function TrendCharts({ specs }: { specs: ChartSpec[] }) {
  return (
    <div className="space-y-2">
      {specs.map((spec) => (
        <Card key={spec.id} className="p-3">
          <h3 className="mb-1 text-[13px] font-bold">{spec.title}</h3>
          <TrendChart spec={spec} />
        </Card>
      ))}
    </div>
  )
}

function TrendChart({ spec }: { spec: ChartSpec }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [failed, setFailed] = useState(false)
  // Redraw only when the data changes, not on every parent render
  const key = JSON.stringify(spec.config.data)

  useEffect(() => {
    let chart: Chart | null = null
    let cancelled = false
    loadChartJs()
      .then(({ Chart }) => {
        if (cancelled || !canvasRef.current) {
          return
        }
        chart = new Chart(canvasRef.current, {
          ...spec.config,
          options: { ...spec.config.options, responsive: true, maintainAspectRatio: false },
        })
      })
      .catch(() => setFailed(true))
    return () => {
      cancelled = true
      chart?.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  if (failed) {
    return <p className="text-xs text-cocoa">Chart couldn't load.</p>
  }
  return (
    <div className="relative h-52">
      <canvas ref={canvasRef} role="img" aria-label={spec.title} />
    </div>
  )
}
