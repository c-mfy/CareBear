import { cx } from '../lib/cx'
import type { Field, FieldValue } from '../types'

/** Renders one field from the tag sheet: check, number, or notes. */
export function FieldInput({
  field,
  value,
  onChange,
}: {
  field: Field
  value: FieldValue | undefined
  onChange: (v: FieldValue) => void
}) {
  if (field.type === 'check') {
    const checked = value === true
    return (
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className="flex min-h-[52px] w-full items-center gap-3 rounded-2xl bg-white px-4 text-left text-sm active:scale-[0.99]"
      >
        <span
          className={cx(
            'flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] border-2 text-[13px] text-white',
            checked && 'border-teal bg-teal',
            !checked && 'border-sea',
          )}
        >
          {checked && '✓'}
        </span>
        {field.label}
      </button>
    )
  }

  if (field.type === 'number') {
    let shown = ''
    if (typeof value === 'number') {
      shown = String(value)
    }
    return (
      <label className="flex min-h-[52px] items-center gap-3 rounded-2xl bg-white px-4 text-sm">
        <span className="flex-1">{field.label}</span>
        <input
          type="number"
          inputMode="decimal"
          value={shown}
          placeholder="—"
          onChange={(e) => {
            if (e.target.value === '') {
              onChange('') // empty = not filled in
            } else {
              onChange(Number(e.target.value))
            }
          }}
          className="w-20 rounded-lg bg-mist px-2 py-1.5 text-right font-semibold outline-none"
        />
        <span className="w-12 text-xs text-cocoa">{field.unit}</span>
      </label>
    )
  }

  let text = ''
  if (typeof value === 'string') {
    text = value
  }
  return (
    <textarea
      value={text}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Notes for the care team (optional)"
      rows={3}
      className="w-full rounded-2xl bg-white p-4 text-sm outline-none"
    />
  )
}
