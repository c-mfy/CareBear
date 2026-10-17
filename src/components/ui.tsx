import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from '../lib/cx'

export function Section({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="mt-6">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  )
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('rounded-2xl bg-white p-4 shadow-sm', className)}>{children}</div>
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' }

/** Touch-friendly button (min 48px tall). */
export function Button({ variant = 'primary', className, ...rest }: ButtonProps) {
  return (
    <button
      className={cx(
        'min-h-12 w-full rounded-xl px-4 font-semibold transition active:scale-[0.98] disabled:opacity-50',
        variant === 'primary' && 'bg-brand text-white',
        variant === 'ghost' && 'border border-gray-300 bg-white text-ink',
        className,
      )}
      {...rest}
    />
  )
}

export function Dot({ color }: { color: string }) {
  return <span className="inline-block h-3 w-3 shrink-0 rounded-full" style={{ background: color }} />
}

/** Mobile container used by every page */
export function Page({ children }: { children: ReactNode }) {
  return <div className="mx-auto min-h-dvh max-w-md pb-10">{children}</div>
}
