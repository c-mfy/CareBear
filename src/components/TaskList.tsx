import { Link } from 'react-router-dom'
import { cx } from '../lib/cx'
import { formatScheduled } from '../lib/format'
import { useStore } from '../lib/store'
import { buildTodayTasks } from '../lib/tasks'
import { Card } from './ui'

/**
 * Today's to-do list. Tasks are checked off by logging (NFC tap), not by tapping the box.
 * Each row also links to its log page so you can test without an NFC tag.
 */
export function TaskList() {
  const { state } = useStore()
  const tasks = buildTodayTasks(state.logs)

  return (
    <Card className="p-2">
      <ul>
        {tasks.map((t) => (
          <li key={`${t.deviceId}-${t.sessionId}`}>
            <Link
              to={`/log/${t.deviceId}?session=${t.sessionId}`}
              className="flex min-h-12 items-center gap-3 rounded-xl px-2 active:bg-gray-100"
            >
              <span
                className={cx(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 text-sm text-white',
                  t.done && 'border-brand bg-brand',
                  !t.done && 'border-gray-300',
                )}
              >
                {t.done && '✓'}
              </span>
              <span className={cx('flex-1 text-sm', t.done && 'text-gray-400 line-through')}>{t.title}</span>
              <span className="text-xs text-gray-500">{formatScheduled(t.time)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  )
}
