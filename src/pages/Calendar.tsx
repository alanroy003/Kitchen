import { useMemo, useState, type KeyboardEvent } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useData } from '../context/DataContext'
import { Card, PageHeader } from '../components/ui'
import { MealRow } from '../components/MealToggle'
import { Legend } from './Dashboard'
import { cellsForRange, formatRupees, type MealCell } from '../lib/ledger'
import { addDays, addMonths, daysInMonth, formatDate, formatTime, monthStart, weekdayMon0, type ISODate } from '../lib/dates'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function CalendarPage() {
  const { input, today, profile } = useData()
  const [month, setMonth] = useState(monthStart(today))
  const [selected, setSelected] = useState<ISODate>(today)
  const times = [profile.breakfast_time, profile.lunch_time, profile.dinner_time]

  const n = daysInMonth(month)
  const lastDay = addDays(month, n - 1)
  const days = useMemo(() => cellsForRange(input, month, lastDay), [input, month, lastDay])
  const lead = weekdayMon0(month)

  const stats = useMemo(() => {
    let eaten = 0, skipped = 0, planned = 0
    for (const d of days) for (const c of d) {
      if (c.beforeStart) continue
      if (c.final) c.status === 'taken' ? eaten++ : skipped++
      else if (c.status === 'taken') planned++
    }
    return { eaten, skipped, planned }
  }, [days])

  const selectedCells = useMemo(() => cellsForRange(input, selected, selected)[0], [input, selected])

  function pick(d: ISODate) {
    setSelected(d)
    if (matchMedia('(max-width: 1023px)').matches) {
      requestAnimationFrame(() => document.getElementById('day-panel')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }))
    }
  }

  function go(delta: number) {
    const m = addMonths(month, delta)
    setMonth(m)
    setSelected(today.startsWith(m.slice(0, 7)) ? today : m)
  }

  // Arrow-key navigation across the grid (roving focus).
  function onKey(e: KeyboardEvent, date: ISODate) {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key]
    if (!step) return
    e.preventDefault()
    const next = addDays(date, step)
    if (next.slice(0, 7) !== month.slice(0, 7)) setMonth(monthStart(next))
    setSelected(next)
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(`[data-date="${next}"]`)?.focus())
  }

  const monthLabel = formatDate(month, { month: 'long', year: 'numeric' })

  return (
    <div className="animate-rise">
      <PageHeader title="Calendar" subtitle="Tap a day to view or correct its meals. Past days can be edited too — the balance updates instantly." />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card aria-labelledby="month-h" className="!p-3.5 sm:!p-6">
          <div className="mb-4 flex items-center justify-between gap-2 px-1.5 sm:px-0">
            <h2 id="month-h" className="font-display text-xl font-semibold sm:text-2xl" aria-live="polite">{monthLabel}</h2>
            <div className="flex gap-1">
              <button onClick={() => go(-1)} className="flex size-10 items-center justify-center rounded-xl border border-line hover:bg-surface-2" aria-label="Previous month"><ChevronLeft className="size-5" aria-hidden /></button>
              <button onClick={() => { setMonth(monthStart(today)); setSelected(today) }} className="min-h-10 rounded-xl border border-line px-3 text-sm font-semibold hover:bg-surface-2">Today</button>
              <button onClick={() => go(1)} className="flex size-10 items-center justify-center rounded-xl border border-line hover:bg-surface-2" aria-label="Next month"><ChevronRight className="size-5" aria-hidden /></button>
            </div>
          </div>

          <div role="grid" aria-labelledby="month-h" className="grid grid-cols-7 gap-1 sm:gap-1.5">
            <div role="row" className="contents">
              {WEEKDAYS.map((w) => <div key={w} role="columnheader" className="pb-2 text-center text-xs font-semibold uppercase tracking-wider text-muted">{w}</div>)}
            </div>
            <div role="row" className="contents">
              {Array.from({ length: lead }, (_, i) => <div key={`pad${i}`} role="gridcell" aria-hidden />)}
              {days.map((cells) => (
                <DayCell key={cells[0].date} cells={cells} today={today} selected={selected === cells[0].date}
                  onSelect={() => pick(cells[0].date)} onKey={(e) => onKey(e, cells[0].date)} />
              ))}
            </div>
          </div>
          <div className="mt-4 border-t border-line px-1.5 pt-4 sm:px-0"><Legend /></div>
        </Card>

        <div className="space-y-6">
          <div id="day-panel" className="scroll-mt-20"><Card aria-labelledby="day-h">
            <h2 id="day-h" className="font-display text-xl font-semibold">{formatDate(selected, { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
            <p className="mt-1 text-sm text-muted">{selected === today ? 'Today' : selected < today ? 'Past day — edits refund or charge meals' : 'Upcoming'}</p>
            <div className="mt-4 divide-y divide-line">
              {selectedCells.map((c) => <MealRow key={c.meal} cell={c} time={formatTime(times[c.meal])} />)}
            </div>
          </Card></div>

          <Card aria-labelledby="ms-h">
            <h2 id="ms-h" className="text-sm font-semibold uppercase tracking-wider text-muted">{formatDate(month, { month: 'long' })} summary</h2>
            <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div><dt className="text-xs text-muted">Eaten</dt><dd className="font-display text-2xl font-semibold tabular">{stats.eaten}</dd></div>
              <div><dt className="text-xs text-muted">Skipped</dt><dd className="font-display text-2xl font-semibold tabular">{stats.skipped}</dd></div>
              <div><dt className="text-xs text-muted">Planned</dt><dd className="font-display text-2xl font-semibold tabular">{stats.planned}</dd></div>
            </dl>
            <p className="mt-4 border-t border-line pt-4 text-sm text-muted">
              Spent this month: <span className="font-semibold text-ink tabular">{formatRupees((stats.eaten * profile.rate) / 3)}</span>
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}

function DayCell({ cells, today, selected, onSelect, onKey }: {
  cells: MealCell[]; today: ISODate; selected: boolean; onSelect: () => void; onKey: (e: KeyboardEvent) => void
}) {
  const date = cells[0].date
  const isToday = date === today
  const edited = cells.some((c) => !c.isDefault)
  const tracked = !cells[0].beforeStart
  const eaten = cells.filter((c) => c.status === 'taken').length
  const desc = tracked
    ? cells.map((c) => `${['Breakfast', 'Lunch', 'Dinner'][c.meal]} ${c.status === 'taken' ? (c.final ? 'eaten' : 'will eat') : (c.final ? 'skipped' : 'not needed')}`).join(', ')
    : 'not tracked'

  return (
    <div role="gridcell" aria-selected={selected}>
      <button data-date={date} onClick={onSelect} onKeyDown={onKey} tabIndex={selected ? 0 : -1}
        aria-label={`${formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}${isToday ? ', today' : ''}: ${desc}${edited ? ', edited' : ''}`}
        className={`relative flex aspect-square w-full flex-col items-center justify-center gap-1.5 rounded-xl text-sm transition-colors sm:aspect-[1/0.9] ${selected ? 'bg-ink text-bg' : isToday ? 'bg-accent-soft' : 'hover:bg-surface-2'} ${!tracked ? 'opacity-40' : ''}`}>
        <span className={`tabular font-semibold ${isToday && !selected ? 'text-accent' : ''}`}>{Number(date.slice(8))}</span>
        {tracked && (
          <span className="flex gap-[3px]" aria-hidden>
            {cells.map((c) => (
              <span key={c.meal} className={`size-1.5 rounded-full sm:size-2 ${c.status === 'taken'
                ? (c.final ? (selected ? 'bg-bg' : 'bg-ok') : (selected ? 'bg-bg/70' : 'bg-accent'))
                : (selected ? 'ring-1 ring-bg/50' : 'ring-1 ring-line')}`} />
            ))}
          </span>
        )}
        {edited && <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-warn" aria-hidden />}
        <span className="sr-only">{eaten} of 3</span>
      </button>
    </div>
  )
}
