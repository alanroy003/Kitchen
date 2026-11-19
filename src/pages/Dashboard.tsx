import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowUpRight, CalendarCheck, Plus } from 'lucide-react'
import { useData } from '../context/DataContext'
import { Card, Modal } from '../components/ui'
import { MEAL_ICONS, MealChip, MealRow } from '../components/MealToggle'
import { PaymentForm } from '../components/PaymentForm'
import { cellsForRange, formatMeals, formatRupees, MEAL_NAMES } from '../lib/ledger'
import { addDays, diffDays, formatDate, formatTime, zonedNow } from '../lib/dates'

function greeting(minutes: number) {
  if (minutes < 12 * 60) return 'Good morning'
  if (minutes < 17 * 60) return 'Good afternoon'
  return 'Good evening'
}

export function Dashboard() {
  const { profile, summary, input, today } = useData()
  const [paying, setPaying] = useState(false)
  const times = [profile.breakfast_time, profile.lunch_time, profile.dinner_time]
  const minutes = zonedNow(profile.timezone, input.now).minutes
  const firstName = profile.full_name.split(' ')[0]

  const low = summary.balanceMeals < 6
  const empty = summary.balanceMeals <= 0
  const daysLeft = summary.coveredUntil ? diffDays(summary.coveredUntil, today) : -1
  /** Calendar days of food left, counting today (e.g. 21 meals from breakfast = 7 days). */
  const daysOfFood = daysLeft + 1
  const eatenToday = summary.mealsToday.filter((c) => c.final && c.status === 'taken').length

  return (
    <div className="space-y-5 sm:space-y-6">
      <header className="animate-rise">
        <p className="text-sm font-medium text-muted">{formatDate(today, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <h1 className="mt-0.5 font-display text-[28px] font-semibold leading-tight tracking-tight sm:text-[34px]">
          {greeting(minutes)}{firstName ? `, ${firstName}` : ''}
        </h1>
      </header>

      {/* ── Balance hero ─────────────────────────────────────────── */}
      <section aria-labelledby="bal-h"
        className="animate-rise relative isolate overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#a84b24_0%,#7c3418_55%,#5a230e_100%)] p-6 text-white shadow-[0_20px_40px_-20px_rgb(124_52_24/0.6)] sm:p-8">
        <svg className="pointer-events-none absolute -right-24 -top-24 -z-10 size-80 opacity-[0.12]" viewBox="0 0 100 100" aria-hidden>
          <circle cx="50" cy="50" r="48" fill="none" stroke="white" strokeWidth="0.8" />
          <circle cx="50" cy="50" r="36" fill="none" stroke="white" strokeWidth="0.8" />
          <circle cx="50" cy="50" r="24" fill="none" stroke="white" strokeWidth="0.8" />
        </svg>
        <div className="flex items-start justify-between gap-4">
          <h2 id="bal-h" className="text-[13px] font-semibold uppercase tracking-[0.14em] text-white/70">Balance</h2>
          <button onClick={() => setPaying(true)}
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-semibold text-[#7c3418] shadow-sm transition-transform hover:scale-[1.03] active:scale-95">
            <Plus className="size-4" aria-hidden /> Add payment
          </button>
        </div>
        <p className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="font-display text-[56px] font-semibold leading-none tabular tracking-tight sm:text-7xl">{daysOfFood}</span>
          <span className="text-lg font-medium text-white/75">day{daysOfFood === 1 ? '' : 's'} left</span>
          <span className="text-sm font-medium tabular text-white/60">· {formatMeals(summary.balanceMeals)} meal{summary.balanceMeals === 1 ? '' : 's'}</span>
        </p>
        <p className="mt-2 text-[17px] font-semibold tabular">{formatRupees(summary.balanceRupees)} <span className="font-normal text-white/70">left</span></p>

        <div className="mt-6 flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-sm">
          <CalendarCheck className="size-5 shrink-0 text-white/80" aria-hidden />
          <p className="text-sm leading-snug">
            {summary.coveredUntil ? (
              <>Food covered until <strong className="font-semibold">{daysLeft === 0 ? 'today' : formatDate(summary.coveredUntil, { weekday: 'short', day: 'numeric', month: 'short' })}</strong></>
            ) : <>No meals covered — add a payment to continue</>}
          </p>
        </div>

        {low && (
          <p role="status" className="mt-3 flex items-start gap-2 text-sm font-medium text-[#ffe2c7]">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {empty
              ? summary.balanceMeals < 0 ? `You owe ${formatMeals(-summary.balanceMeals)} meals (${formatRupees(-summary.balanceRupees)}).` : 'Balance is empty.'
              : `Only ${formatMeals(summary.balanceMeals)} meals left — top up soon.`}
          </p>
        )}
      </section>

      {/* ── Quick stats ─────────────────────────────────────────── */}
      <dl className="grid grid-cols-3 gap-2.5 sm:gap-4">
        <Stat label="Eaten" value={String(summary.consumed)} sub="all time" />
        <Stat label="Skipped" value={String(summary.skipped)} sub="saved" />
        <Stat label="Paid" value={formatRupees(summary.totalPaid)} sub={`${formatMeals(summary.paidMeals)} meals`} />
      </dl>

      {/* ── Today ───────────────────────────────────────────────── */}
      <Card aria-labelledby="today-h">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 id="today-h" className="text-lg font-semibold">Today</h2>
            <p className="text-sm text-muted">
              {summary.nextMeal && summary.nextMeal.date === today
                ? `Next: ${MEAL_NAMES[summary.nextMeal.meal]} at ${formatTime(times[summary.nextMeal.meal])}`
                : 'All meals done for today'}
            </p>
          </div>
          <span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold tabular text-muted">{eatenToday}/3 eaten</span>
        </div>
        <div className="divide-y divide-line">
          {summary.mealsToday.map((c) => <MealRow key={c.meal} cell={c} time={formatTime(times[c.meal])} />)}
        </div>
      </Card>

      <DaysCard />

      <Modal open={paying} title="Add payment" onClose={() => setPaying(false)}>
        <PaymentForm compact onDone={() => setPaying(false)} />
      </Modal>
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-3.5 py-3 shadow-card sm:px-5 sm:py-4">
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="mt-1 truncate font-display text-xl font-semibold tabular sm:text-2xl">{value}</dd>
      <dd className="truncate text-[11px] text-muted sm:text-xs">{sub}</dd>
    </div>
  )
}

type Tab = 'past' | 'next'

function DaysCard() {
  const { input, today, profile } = useData()
  const [tab, setTab] = useState<Tab>('next')

  const days = useMemo(() => {
    if (tab === 'next') return cellsForRange(input, addDays(today, 1), addDays(today, 7))
    return cellsForRange(input, addDays(today, -7), addDays(today, -1)).reverse()
  }, [input, today, tab])

  return (
    <Card aria-labelledby="days-h">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="days-h" className="text-lg font-semibold">{tab === 'next' ? 'Plan ahead' : 'Fix past meals'}</h2>
        <div role="tablist" aria-label="Which days" className="inline-flex rounded-full bg-surface-2 p-1">
          {([['past', 'Past 7 days'], ['next', 'Next 7 days']] as const).map(([v, l]) => (
            <button key={v} role="tab" aria-selected={tab === v} aria-controls="days-panel" onClick={() => setTab(v)}
              className={`h-9 rounded-full px-4 text-sm font-semibold transition-all ${tab === v ? 'bg-surface text-ink shadow-card' : 'text-muted hover:text-ink'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-2 text-sm text-muted">
        {tab === 'next'
          ? 'Tap a meal to switch it on or off for that day only.'
          : 'Ate something you skipped, or skipped something marked eaten? Tap to correct — 1 meal is charged or refunded.'}
      </p>

      <div id="days-panel" role="tabpanel" className="mt-4">
        <div className="mb-2 flex items-center gap-3 px-0.5" aria-hidden>
          <span className="w-[68px] shrink-0 sm:w-24" />
          {MEAL_ICONS.map((_, m) => (
            <span key={m} className="flex-1 text-center text-[11px] font-semibold uppercase tracking-wider text-muted">{m === 0 ? 'Bkfst' : MEAL_NAMES[m]}</span>
          ))}
        </div>
        <ul className="space-y-2">
          {days.map((day) => {
            const d = day[0].date
            const label = d === addDays(today, 1) ? 'Tomorrow' : d === addDays(today, -1) ? 'Yesterday' : formatDate(d, { weekday: 'short' })
            return (
              <li key={d} className="flex items-center gap-3">
                <div className="w-[68px] shrink-0 sm:w-24">
                  <p className="text-sm font-semibold leading-tight">{label}</p>
                  <p className="text-xs text-muted">{formatDate(d)}</p>
                </div>
                <div className="flex flex-1 gap-2">{day.map((c) => <MealChip key={c.meal} cell={c} />)}</div>
              </li>
            )
          })}
        </ul>
        {tab === 'past' && days.every((d) => d[0].beforeStart) && (
          <p className="mt-3 text-sm text-muted">Tracking started {formatDate(profile.start_date)} — earlier days aren’t counted. Change the start date in Settings.</p>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <Legend />
        <Link to="/calendar" className="inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline underline-offset-4">
          Full calendar <ArrowUpRight className="size-4" aria-hidden />
        </Link>
      </div>
    </Card>
  )
}

export function Legend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted" aria-label="Legend">
      <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-accent" aria-hidden />Will eat</li>
      <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-ok" aria-hidden />Eaten</li>
      <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-full ring-1 ring-inset ring-muted/50" aria-hidden />Off / skipped</li>
      <li className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-warn" aria-hidden />Edited</li>
    </ul>
  )
}
