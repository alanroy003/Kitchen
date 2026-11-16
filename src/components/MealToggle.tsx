import { Coffee, Moon, RotateCcw, Sun } from 'lucide-react'
import { MEAL_NAMES, type MealCell } from '../lib/ledger'
import { formatDate } from '../lib/dates'
import { useData } from '../context/DataContext'

export const MEAL_ICONS = [Coffee, Sun, Moon]

export function statusLabel(c: MealCell): string {
  if (c.beforeStart) return 'Not tracked'
  if (c.final) return c.status === 'taken' ? 'Eaten' : 'Skipped'
  return c.status === 'taken' ? 'Will eat' : 'Not needed'
}

type Tone = 'accent' | 'ok'

/** iOS-style switch. The 44×56 button is the touch target; the track sits inside it. */
export function Switch({ checked, onChange, label, tone = 'accent', disabled }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; tone?: Tone; disabled?: boolean
}) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled}
      onClick={() => onChange(!checked)}
      className="group relative inline-flex h-11 w-14 shrink-0 items-center justify-center rounded-full disabled:cursor-not-allowed disabled:opacity-40">
      <span aria-hidden
        className={`relative block h-[30px] w-[52px] shrink-0 rounded-full transition-colors duration-200 ${checked ? (tone === 'ok' ? 'bg-ok' : 'bg-accent') : 'bg-muted/30'}`}>
        <span className={`absolute left-[3px] top-[3px] block size-6 rounded-full bg-white shadow-[0_1px_3px_rgb(0_0_0/0.25),0_2px_8px_rgb(0_0_0/0.08)] transition-transform duration-300 ease-[cubic-bezier(.3,1.3,.5,1)] group-active:scale-95 ${checked ? 'translate-x-[22px]' : 'translate-x-0'}`} />
      </span>
    </button>
  )
}

function toneFor(c: MealCell) {
  if (c.beforeStart || c.status !== 'taken') return 'muted' as const
  return c.final ? ('ok' as const) : ('accent' as const)
}

const ICON_TILE = {
  ok: 'bg-ok-soft text-ok',
  accent: 'bg-accent-soft text-accent',
  muted: 'bg-surface-2 text-muted',
}
const BADGE = {
  ok: 'bg-ok-soft text-ok',
  accent: 'bg-accent-soft text-accent',
  muted: 'bg-surface-2 text-muted',
}

/** One meal as a row: icon, name + time, status, switch. Used for today and the calendar. */
export function MealRow({ cell, time }: { cell: MealCell; time: string }) {
  const { setMeal, resetMeal } = useData()
  const Icon = MEAL_ICONS[cell.meal]
  const on = cell.status === 'taken'
  const name = MEAL_NAMES[cell.meal]
  const label = statusLabel(cell)
  const tone = toneFor(cell)

  return (
    <div className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 sm:gap-4">
      <span className={`flex size-11 shrink-0 items-center justify-center rounded-2xl transition-colors ${ICON_TILE[tone]}`}>
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <h3 className="truncate text-[15px] font-semibold">{name}</h3>
          <span className="shrink-0 text-xs text-muted tabular">{time}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold ${BADGE[tone]}`}>{label}</span>
          {!cell.isDefault && !cell.beforeStart && (
            <button onClick={() => resetMeal(cell.date, cell.meal)}
              className="inline-flex h-6 items-center gap-1 rounded-full px-2 text-xs font-medium text-warn ring-1 ring-warn/30 hover:bg-warn-soft"
              aria-label={`${name} was changed from your weekly default. Reset to default`}>
              <RotateCcw className="size-3" aria-hidden /> Edited
            </button>
          )}
        </div>
      </div>
      <Switch checked={on} tone={cell.final ? 'ok' : 'accent'} disabled={cell.beforeStart}
        label={`${name}, ${formatDate(cell.date, { weekday: 'long', day: 'numeric', month: 'long' })}: ${label}`}
        onChange={(v) => setMeal(cell.date, cell.meal, v ? 'taken' : 'skipped')} />
    </div>
  )
}

/** Compact square used in the 7-day lists. */
export function MealChip({ cell }: { cell: MealCell }) {
  const { setMeal } = useData()
  const on = cell.status === 'taken'
  const name = MEAL_NAMES[cell.meal]
  const Icon = MEAL_ICONS[cell.meal]
  const label = statusLabel(cell)
  const tone = toneFor(cell)
  const cls = {
    ok: 'bg-ok-soft text-ok ring-ok/25',
    accent: 'bg-accent-soft text-accent ring-accent/25',
    muted: 'bg-transparent text-muted/70 ring-line',
  }[tone]
  return (
    <button type="button" role="switch" aria-checked={on} disabled={cell.beforeStart}
      onClick={() => setMeal(cell.date, cell.meal, on ? 'skipped' : 'taken')}
      aria-label={`${formatDate(cell.date, { weekday: 'long', day: 'numeric', month: 'long' })}, ${name}: ${label}${cell.isDefault ? '' : ' (edited)'}`}
      className={`relative flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl text-[13px] font-semibold ring-1 ring-inset transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${cls}`}>
      <Icon className={`size-[18px] shrink-0 ${on ? '' : 'opacity-60'}`} aria-hidden />
      <span className="hidden md:inline">{on ? (cell.final ? 'Eaten' : 'Eat') : (cell.final ? 'Skipped' : 'Off')}</span>
      {!cell.isDefault && <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-warn" aria-hidden />}
    </button>
  )
}
