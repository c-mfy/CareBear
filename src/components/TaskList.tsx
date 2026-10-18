import { Link } from 'react-router-dom'
import { cx } from '../lib/cx'
import { formatScheduled, formatTime } from '../lib/format'
import { isSameDay } from '../lib/sessions'
import { useStore } from '../lib/store'
import { buildTodayTasks, type Task } from '../lib/tasks'

/**
 * Today's to-do list (Figma layout): Morning in a tall card on the left (with times and a
 * timeline line between rows), Evening and Bedtime stacked on the right.
 * Tasks are checked off by logging (NFC tap), not by tapping the box.
 * Each row also links to its log page so you can test without an NFC tag.
 */
export function TaskList({ now }: { now: Date }) {
  const { state } = useStore()
  const tasks = buildTodayTasks(state.logs, now)
  const morning = tasks.filter((t) => t.group === 'morning')
  const evening = tasks.filter((t) => t.group === 'evening')
  const bedtime = tasks.filter((t) => t.group === 'bedtime')

  /** Time today's log for this task was made, e.g. "6:49 AM" */
  function doneAt(t: Task): string {
    const log = state.logs.find(
      (l) => l.deviceId === t.deviceId && l.sessionId === t.sessionId && isSameDay(new Date(l.timestamp), now),
    )
    if (log) {
      return formatTime(log.timestamp)
    }
    return ''
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_124px] gap-x-3">
      {/* Morning: tall left card with times */}
      <section className="rounded-[22px] bg-white pt-4 pr-[22px] pb-4 pl-[16px]">
        <GroupLabel>Morning</GroupLabel>
        <ul className="mt-[14px]">
          {morning.map((t, i) => {
            let time = formatScheduled(t.time)
            if (t.done) {
              time = doneAt(t)
            }
            return (
              <li key={`${t.deviceId}-${t.sessionId}`} className="relative">
                <TaskRow task={t} className="h-[31px] pl-[11px]">
                  <span
                    className={cx(
                      'text-[8px] font-bold whitespace-nowrap',
                      t.overdueMinutes > 0 && 'text-rose',
                    )}
                  >
                    {time}
                  </span>
                </TaskRow>
                {/* timeline line between rows */}
                {i < morning.length - 1 && (
                  <span className="pointer-events-none absolute top-[24px] left-[16.5px] h-[14px] w-px bg-[#bfbfbf]" />
                )}
              </li>
            )
          })}
        </ul>
      </section>

      {/* Evening + Bedtime: small stacked cards on the right */}
      <div className="flex flex-col gap-[11px]">
        <SmallGroup label="Evening" tasks={evening} />
        <SmallGroup label="Bedtime" tasks={bedtime} />
      </div>
    </div>
  )
}

function GroupLabel({ children }: { children: string }) {
  return <h3 className="pl-[9px] text-[10px] font-bold tracking-wide uppercase">{children}</h3>
}

function SmallGroup({ label, tasks }: { label: string; tasks: Task[] }) {
  return (
    <section className="min-h-[110px] flex-1 rounded-[22px] bg-white px-[15px] pt-[14px] pb-3">
      <h3 className="text-[10px] font-bold tracking-wide uppercase">{label}</h3>
      <ul className="mt-[13px]">
        {tasks.map((t) => (
          <li key={`${t.deviceId}-${t.sessionId}`}>
            <TaskRow task={t} className="h-5" />
          </li>
        ))}
      </ul>
    </section>
  )
}

/** One task: 12px status box + device name, linking to the log page. */
function TaskRow({ task, className, children }: { task: Task; className?: string; children?: React.ReactNode }) {
  return (
    <Link
      to={`/log/${task.deviceId}`}
      state={{ sessionId: task.sessionId }}
      aria-label={`${task.title}, ${task.label}`}
      className={cx('flex items-center gap-4 rounded-md active:bg-blossom', className)}
    >
      <span
        className={cx(
          'flex h-3 w-3 shrink-0 items-center justify-center rounded-[2px] text-[8px] leading-none font-black text-white',
          task.done && 'bg-sea',
          !task.done && task.overdueMinutes > 0 && 'bg-rose',
          !task.done && task.overdueMinutes === 0 && 'bg-[#d9d9d9]',
        )}
      >
        {task.done && '✓'}
      </span>
      <span
        className={cx(
          'min-w-0 flex-1 truncate text-[10px] font-bold',
          task.done && 'text-black/45 line-through',
          task.overdueMinutes > 0 && 'text-rose',
        )}
      >
        {task.title}
      </span>
      {children}
    </Link>
  )
}
