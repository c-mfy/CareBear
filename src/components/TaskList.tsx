import { Link } from 'react-router-dom'
import { cx } from '../lib/cx'
import { formatScheduled, formatTime } from '../lib/format'
import { isSameDay } from '../lib/sessions'
import { useStore } from '../lib/store'
import { buildTodayTasks } from '../lib/tasks'
import { DeviceIcon } from './icons'
import { Tag } from './ui'

/**
 * Today's to-do list. Tasks are checked off by logging (NFC tap), not by tapping the box.
 * Each row also links to its log page so you can test without an NFC tag.
 */
export function TaskList() {
  const { state } = useStore()
  const tasks = buildTodayTasks(state.logs)
  const groups = [
    { id: 'morning' as const, label: 'Morning' },
    { id: 'evening' as const, label: 'Evening' },
    { id: 'bedtime' as const, label: 'Bedtime' },
  ]
  const now = new Date()

  /** Time today's log for this task was made, e.g. "6:49 AM" */
  function doneAt(deviceId: string, sessionId: string): string {
    const log = state.logs.find(
      (l) => l.deviceId === deviceId && l.sessionId === sessionId && isSameDay(new Date(l.timestamp), now),
    )
    if (log) {
      return formatTime(log.timestamp)
    }
    return ''
  }

  return (
    <div className="space-y-2">
      {groups.map((group) => {
        const groupTasks = tasks.filter((task) => task.group === group.id)
        if (groupTasks.length === 0) {
          return null
        }
        return (
          <section key={group.id} className="rounded-[18px] bg-white px-3 py-1.5">
            <h3 className="px-1 pt-1.5 pb-1 text-[11px] font-bold tracking-wider text-cocoa uppercase">
              {group.label}
            </h3>
            <ul>
              {groupTasks.map((t) => {
                let status = <Tag className="bg-aqua text-brown">Due {formatScheduled(t.time)}</Tag>
                if (t.done) {
                  status = <span className="text-xs text-cocoa">{doneAt(t.deviceId, t.sessionId)}</span>
                }
                return (
                  <li key={`${t.deviceId}-${t.sessionId}`} className="border-t border-lilac first:border-t-0">
                    <Link
                      to={`/log/${t.deviceId}`}
                      state={{ sessionId: t.sessionId }}
                      className="flex min-h-12 items-center gap-2.5 rounded-xl px-1 py-1.5 active:bg-lilac"
                    >
                      <span
                        className={cx(
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 text-[11px] text-white',
                          t.done && 'border-teal bg-teal',
                          !t.done && 'border-sea',
                        )}
                      >
                        {t.done && '✓'}
                      </span>
                      <DeviceIcon deviceId={t.deviceId} size={26} />
                      <span className={cx('flex-1 text-[13px]', t.done && 'text-cocoa line-through')}>
                        {t.title}
                      </span>
                      {status}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
