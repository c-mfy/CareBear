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
        className={cx(
          'flex min-h-12 w-full items-center gap-3 rounded-xl border px-3 text-left',
          checked && 'border-brand bg-brand/10',
          !checked && 'border-gray-300 bg-white',
        )}
      >
        <span
          className={cx(
            'flex h-6 w-6 items-center justify-center rounded-md border-2 text-sm text-white',
            checked && 'border-brand bg-brand',
            !checked && 'border-gray-300',
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
      <label className="flex min-h-12 items-center gap-3 rounded-xl border border-gray-300 bg-white px-3">
        <span className="flex-1">{field.label}</span>
        <input
          type="number"
          inputMode="decimal"
          value={shown}
          onChange={(e) => {
            if (e.target.value === '') {
              onChange('') // empty = not filled in
            } else {
              onChange(Number(e.target.value))
            }
          }}
          className="w-20 bg-transparent text-right font-semibold outline-none"
        />
        <span className="text-sm text-gray-500">{field.unit}</span>
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
      placeholder="Notes (optional)"
      rows={4}
      className="w-full rounded-xl border border-gray-300 bg-white p-3"
    />
  )
}
