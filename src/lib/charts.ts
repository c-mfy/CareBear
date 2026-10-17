// Chart.js configs for the doctor's-note trends. One definition per chart, drawn both on the page
// (TrendCharts) and into the PDF (renderChartImages). chart.js is loaded on demand.

import type { ChartConfiguration } from 'chart.js'
import type { ChartImage } from './pdf-kit'
import type { Trends } from './trends'

const TEAL = '#1bb3b0'
const SEA = '#6ebec1'
const BLUSH = '#f5a8c9'
const ALERT = '#d6336c'
const COCOA = '#755339'
const BROWN = '#40312a'
const GRID = '#e6eeee'

export interface ChartSpec {
  id: string
  title: string
  config: ChartConfiguration
}

function axes(yTitle: string, stacked = false) {
  return {
    x: { stacked, grid: { display: false }, ticks: { color: COCOA } },
    y: {
      stacked,
      grid: { color: GRID },
      ticks: { color: COCOA },
      title: { display: true, text: yTitle, color: COCOA },
    },
  }
}

const legend = { position: 'bottom' as const, labels: { color: BROWN, boxWidth: 12, usePointStyle: true } }

export function chartSpecs(t: Trends): ChartSpec[] {
  return [
    {
      id: 'adherence',
      title: 'Daily treatments: on time, late, missed',
      config: {
        type: 'bar',
        data: {
          labels: t.days,
          datasets: [
            { label: 'On time', data: t.adherence.onTime, backgroundColor: TEAL },
            { label: 'Late (30+ min)', data: t.adherence.late, backgroundColor: BLUSH },
            { label: 'Missed', data: t.adherence.missed, backgroundColor: ALERT },
          ],
        },
        options: { scales: axes('Treatments', true), plugins: { legend } },
      },
    },
    {
      id: 'dose-timing',
      title: 'Trikafta dose timing (minutes from scheduled)',
      config: {
        type: 'line',
        data: {
          labels: t.days,
          datasets: [
            { label: 'Morning dose', data: t.doseTiming.morning, borderColor: TEAL, backgroundColor: TEAL },
            { label: 'Evening dose', data: t.doseTiming.evening, borderColor: COCOA, backgroundColor: COCOA },
            {
              label: 'Late threshold (30 min)',
              data: t.days.map(() => 30),
              borderColor: ALERT,
              borderDash: [6, 4],
              borderWidth: 1.5,
              pointRadius: 0,
            },
          ],
        },
        options: {
          elements: { point: { radius: 4 } },
          scales: { ...axes('Minutes late'), y: { ...axes('Minutes late').y, suggestedMin: 0 } },
          plugins: { legend },
        },
      },
    },
    {
      id: 'feed',
      title: 'Overnight feed: volume infused vs. prescribed',
      config: {
        type: 'bar',
        data: {
          labels: t.days,
          datasets: [
            { type: 'bar', label: 'Infused (mL)', data: t.feed.infused, backgroundColor: SEA },
            {
              type: 'line',
              label: 'Prescribed (mL)',
              data: t.feed.prescribed,
              borderColor: BROWN,
              backgroundColor: BROWN,
              borderDash: [6, 4],
              borderWidth: 1.5,
              pointRadius: 0,
            },
          ],
        },
        options: { scales: { ...axes('mL'), y: { ...axes('mL').y, suggestedMin: 0 } }, plugins: { legend } },
      },
    },
    {
      id: 'vest',
      title: 'Vest therapy (minutes per session)',
      config: {
        type: 'line',
        data: {
          labels: t.days,
          datasets: [
            { label: 'Morning', data: t.vest.morning, borderColor: TEAL, backgroundColor: TEAL },
            { label: 'Evening', data: t.vest.evening, borderColor: COCOA, backgroundColor: COCOA },
          ],
        },
        options: {
          elements: { point: { radius: 4 } },
          scales: { ...axes('Minutes'), y: { ...axes('Minutes').y, suggestedMin: 0, suggestedMax: 40 } },
          plugins: { legend },
        },
      },
    },
  ]
}

let chartJs: Promise<typeof import('chart.js')> | null = null

/** chart.js, loaded once and with every chart type registered. */
export function loadChartJs(): Promise<typeof import('chart.js')> {
  chartJs ??= import('chart.js').then((mod) => {
    mod.Chart.register(...mod.registerables)
    mod.Chart.defaults.font.family = 'Poppins, system-ui, sans-serif'
    return mod
  })
  return chartJs
}

/** Draw each chart off-screen and return PNGs for the PDF. */
export async function renderChartImages(specs: ChartSpec[]): Promise<ChartImage[]> {
  const { Chart } = await loadChartJs()
  const width = 900
  const height = 270
  return specs.map((spec) => {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const chart = new Chart(canvas, {
      ...spec.config,
      options: { ...spec.config.options, animation: false, responsive: false, devicePixelRatio: 2 },
    } as ChartConfiguration)
    const dataUrl = chart.toBase64Image('image/png', 1)
    chart.destroy()
    return { title: spec.title, dataUrl, aspect: width / height }
  })
}
