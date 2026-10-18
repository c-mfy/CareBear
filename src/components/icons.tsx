// Simple line icons drawn in palette colors (no emoji, so no off-palette colors).

const BROWN = '#40312a'

function Svg({ size, color, children }: { size: number; color: string; children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

/** Icon + soft tile color for each device / medicine. */
const deviceStyles: Record<string, { tile: string; path: React.ReactNode }> = {
  vest: {
    tile: 'bg-blush',
    path: (
      <>
        <path d="M8 3 5 6v14h5v-6h4v6h5V6l-3-3" />
        <path d="M8 3c1 2 2.5 3 4 3s3-1 4-3" />
      </>
    ),
  },
  nebulizer: {
    tile: 'bg-mist',
    path: (
      <>
        <path d="M3 9h11a3 3 0 1 0-3-3" />
        <path d="M3 14h15a3 3 0 1 1-3 3" />
      </>
    ),
  },
  'feeding-pump': {
    tile: 'bg-aqua',
    path: <path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z" />,
  },
  trikafta: {
    tile: 'bg-blush',
    path: (
      <>
        <rect x="3" y="8" width="18" height="8" rx="4" transform="rotate(-35 12 12)" />
        <path d="M9.5 8.5l5 7" />
      </>
    ),
  },
}

/** Rounded square tile with the device's icon. */
export function DeviceIcon({ deviceId, size = 28 }: { deviceId: string; size?: number }) {
  let style = deviceStyles[deviceId]
  if (!style) {
    style = { tile: 'bg-mist', path: <circle cx="12" cy="12" r="6" /> }
  }
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-[30%] ${style.tile}`}
      style={{ width: size, height: size }}
    >
      <Svg size={Math.round(size * 0.55)} color={BROWN}>
        {style.path}
      </Svg>
    </span>
  )
}

export function BackIcon() {
  return (
    <Svg size={20} color={BROWN}>
      <path d="M15 5l-7 7 7 7" />
    </Svg>
  )
}

/** Phone handset (EMERGENCY button). Uses the text color. */
export function PhoneIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
    </svg>
  )
}

/** Document with lines (Doctor's Note button). Uses the text color. */
export function DocIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M9 13h6M9 17h6" />
    </svg>
  )
}

/** Small right chevron. Uses the text color. */
export function ChevronIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}