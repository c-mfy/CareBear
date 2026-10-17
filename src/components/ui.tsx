import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from '../lib/cx'

export function Section({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="mt-5">
      <div className="mb-2 flex items-end justify-between px-0.5">
        <h2 className="font-display text-base font-bold">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  )
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('rounded-[20px] bg-white p-4', className)}>{children}</div>
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' }

/** Touch-friendly button (min 48px tall). */
export function Button({ variant = 'primary', className, ...rest }: ButtonProps) {
  return (
    <button
      className={cx(
        'min-h-12 w-full rounded-full px-4 font-semibold transition active:scale-[0.98] disabled:opacity-50',
        variant === 'primary' && 'bg-teal text-white',
        variant === 'ghost' && 'border-[1.5px] border-aqua bg-white text-brown',
        className,
      )}
      {...rest}
    />
  )
}

/** Small rounded label, e.g. "Due 6:15 PM" or "AI summary" */
export function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        'inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2.5 text-[11px] font-semibold whitespace-nowrap',
        className,
      )}
    >
      {children}
    </span>
  )
}

/** Red "!" marking a handoff flagged as abnormal. */
export function FlagMark({ className }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="Flagged as abnormal"
      title="Flagged as abnormal"
      className={cx(
        'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose text-xs font-extrabold text-white',
        className,
      )}
    >
      !
    </span>
  )
}

export function Dot({ color }: { color: string }) {
  return <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
}

/** Dark (or teal) bar pinned to the bottom of the phone screen. */
export function BottomBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md px-4 pb-5">
      <div
        className={cx(
          'pointer-events-auto flex min-h-14 items-center justify-between rounded-full bg-brown py-1.5 pr-1.5 pl-5 font-semibold text-white shadow-lg',
          className,
        )}
      >
        {children}
      </div>
    </div>
  )
}

/** Mobile container used by every page. bottomBar = leave room for a BottomBar. */
export function Page({
  children,
  className,
  bottomBar,
}: {
  children: ReactNode
  className?: string
  bottomBar?: boolean
}) {
  return (
    <div className={cx('min-h-dvh', className)}>
      <div className={cx('mx-auto max-w-md', bottomBar && 'pb-28', !bottomBar && 'pb-10')}>{children}</div>
    </div>
  )
}
