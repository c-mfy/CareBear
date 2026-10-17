/** Join class names, skipping false/empty values: cx('a', isOn && 'b') */
export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}
