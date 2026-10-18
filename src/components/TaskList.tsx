import { useState, type CSSProperties } from 'react'
import { flushSync } from 'react-dom'
import { Link } from 'react-router-dom'
import { cx } from '../lib/cx'
import { formatScheduled, formatTime } from '../lib/format'
import { isSameDay } from '../lib/sessions'
import { useStore } from '../lib/store'
import { buildTodayTasks, type Task } from '../lib/tasks'

type Group = Task['group']

const GROUPS: { id: Group; label: string }[] = [
  { id: 'morning', label: 'Morning' },
  { id: 'evening', label: 'Evening' },
  { id: 'bedtime', label: 'Bedtime' },
]

/** Which part of the day it is on this device: before noon, noon to 9 PM, after 9 PM. */
function currentGroup(now: Date): Group {
  const hour = now.getHours()
  if (hour < 12) {
    return 'morning'
  }
  if (hour < 21) {
    return 'evening'
  }
  return 'bedtime'
}

/** Gives a card a stable name so the browser can animate it between the left and right spots. */
function transitionName(group: Group): CSSProperties {
  return { viewTransitionName: `tasks-${group}` }
}

/**
 * Today's to-do list.
 * The big card on the left is the current part of the day (by the phone's clock), with times.
 * The other two sit small on the right; tap one to swap it into the big spot (animated).
 * Tasks are checked off by logging (NFC tap), not by tapping the box.
 */
export function TaskList({ now }: { now: Date }) {
  const { state } = useStore()
  const tasks = buildTodayTasks(state.logs, now)
  const autoGroup = currentGroup(now)
  // null = follow the clock; set when someone taps a small card
  const [picked, setPicked] = useState<Group | null>(null)

  let featured = autoGroup
  if (picked) {
    featured = picked
  }

  function pick(group: Group) {
    let next: Group | null = group
    if (group === autoGroup) {
      next = null // back to following the clock
    }
    const update = () => flushSync(() => setPicked(next))
    if (document.startViewTransition) {
      document.startViewTransition(update)
    } else {
      update()
    }
  }

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

  const big = GROUPS.find((g) => g.id === featured) || GROUPS[0]
  const small = GROUPS.filter((g) => g.id !== featured)

  return (
    // The left card sets the height. The right column is absolutely positioned inside its grid cell,
    // so it adds no height of its own: its two cards share the left card's height and clip extra tasks.
    <div className="grid grid-cols-[minmax(0,1fr)_124px] gap-x-3">
      <BigGroup
        label={big.label}
        isNow={big.id === autoGroup}
        tasks={tasks.filter((t) => t.group === big.id)}
        doneAt={doneAt}
        style={transitionName(big.id)}
      />
      <div className="relative">
        <div className="absolute inset-0 flex flex-col gap-[11px]">
        {small.map((g) => (
          <SmallGroup
            key={g.id}
            label={g.label}
            isNow={g.id === autoGroup}
            tasks={tasks.filter((t) => t.group === g.id)}
            onExpand={() => pick(g.id)}
            style={transitionName(g.id)}
          />
        ))}
        </div>
      </div>
    </div>
  )
}

function NowTag() {
  return <span className="rounded-full bg-mist px-1.5 py-px text-[8px] font-black text-sea">NOW</span>
}

/** Left card: the full list with times and a timeline line between rows. */
function BigGroup({
  label,
  isNow,
  tasks,
  doneAt,
  style,
}: {
  label: string
  isNow: boolean
  tasks: Task[]
  doneAt: (t: Task) => string
  style: CSSProperties
}) {
  return (
    <section style={style} className="min-h-[91px] rounded-[22px] bg-white pt-4 pr-4 pb-3 pl-[16px]">
      <h3 className="flex items-center gap-1.5 pl-[9px] text-[10px] font-bold tracking-wide uppercase">
        {label}
        {isNow && <NowTag />}
      </h3>
      <ul className="mt-[10px]">
        {tasks.map((t, i) => {
          let time = formatScheduled(t.time)
          if (t.done) {
            time = doneAt(t)
          }
          return (
            <li key={`${t.deviceId}-${t.sessionId}`} className="relative">
              <Link
                to={`/log/${t.deviceId}`}
                state={{ sessionId: t.sessionId }}
                aria-label={`${t.title}, ${t.label}`}
                className="flex h-[31px] items-center gap-3 rounded-md pl-[11px] active:bg-blossom"
              >
                <StatusBox task={t} />
                <TaskName task={t} />
                <span className={cx('text-[8px] font-bold whitespace-nowrap', t.overdueMinutes > 0 && 'text-rose')}>
                  {time}
                </span>
              </Link>
              {/* timeline line between rows */}
              {i < tasks.length - 1 && (
                <span className="pointer-events-none absolute top-[24px] left-[16.5px] h-[14px] w-px bg-[#bfbfbf]" />
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** Right card: names only. The whole card is a button that swaps it into the big spot. */
function SmallGroup({
  label,
  isNow,
  tasks,
  onExpand,
  style,
}: {
  label: string
  isNow: boolean
  tasks: Task[]
  onExpand: () => void
  style: CSSProperties
}) {
  return (
    <button
      type="button"
      onClick={onExpand}
      style={style}
      aria-label={`Show ${label.toLowerCase()} tasks with times`}
      className="relative min-h-10 w-full flex-[1_1_auto] overflow-hidden rounded-[22px] bg-white px-[15px] pt-[14px] pb-3 text-left active:scale-[0.98]"
    >
      <span className="flex items-center justify-between gap-1">
        <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-wide uppercase">
          {label}
          {isNow && <NowTag />}
        </span>
        <span aria-hidden="true" className="text-xs leading-none text-sea">
          ‹
        </span>
      </span>
      <span className="mt-[11px] block">
        {tasks.map((t) => (
          <span key={`${t.deviceId}-${t.sessionId}`} className="flex h-5 items-center gap-3">
            <StatusBox task={t} />
            <TaskName task={t} />
          </span>
        ))}
      </span>
      {/* soft fade where tasks get cut off */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-white to-transparent" />
    </button>
  )
}

/** 12px box: teal check = done, pink = overdue, gray = not yet. */
function StatusBox({ task }: { task: Task }) {
  return (
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
  )
}

function TaskName({ task }: { task: Task }) {
  return (
    <span
      className={cx(
        'min-w-0 flex-1 truncate text-[10px] font-bold',
        task.done && 'text-black/45 line-through',
        task.overdueMinutes > 0 && 'text-rose',
      )}
    >
      {task.title}
    </span>
  )
}