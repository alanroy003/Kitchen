// The single source of truth for meal status and balance.
//
//   status(date, meal) = override ?? weekly default in force on that date
//   A meal is *final* once its time has passed (in the user's timezone).
//   Final + taken  -> consumed: uses 1 meal of balance.
//   Final + skipped -> costs nothing.
//   Balance (meals) = Σ payment.meals − consumed.
//   Rupees = meals × rate / 3.

import { addDays, diffDays, timeToMinutes, weekdayMon0, zonedNow, type ISODate } from './dates.ts'

export type Meal = 0 | 1 | 2
export const MEALS: readonly Meal[] = [0, 1, 2]
export const MEAL_NAMES = ['Breakfast', 'Lunch', 'Dinner'] as const
export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const

export type PlanStatus = 'taken' | 'skipped'

export interface Profile {
  id: string
  full_name: string
  timezone: string
  start_date: ISODate
  breakfast_time: string
  lunch_time: string
  dinner_time: string
  rate: number
}

export interface ScheduleVersion {
  effective_from: ISODate
  pattern: boolean[] // 21 entries, weekday * 3 + meal
}

export interface Override {
  date: ISODate
  meal: Meal
  status: PlanStatus
}

export interface Payment {
  id: number
  amount: number
  rate: number
  meals: number
  paid_on: ISODate
  note: string
  created_at: string
}

export interface MealCell {
  date: ISODate
  meal: Meal
  status: PlanStatus
  isDefault: boolean   // false when an override changed it from the weekly default
  defaultStatus: PlanStatus
  isOverride: boolean  // an override row exists (even if equal to default)
  final: boolean       // meal time has passed
  beforeStart: boolean // before the user's tracking start date
}

export interface LedgerInput {
  profile: Profile
  schedules: ScheduleVersion[]
  overrides: Override[]
  payments: Payment[]
  now?: Date
}

export const key = (date: ISODate, meal: Meal) => `${date}#${meal}`

export function mealTimes(p: Profile): [number, number, number] {
  return [timeToMinutes(p.breakfast_time), timeToMinutes(p.lunch_time), timeToMinutes(p.dinner_time)]
}

/** Builds a fast resolver for meal status. Schedules may be in any order. */
export function createResolver(input: LedgerInput) {
  const { profile } = input
  const schedules = [...input.schedules].sort((a, b) => (a.effective_from < b.effective_from ? 1 : -1))
  const overrides = new Map(input.overrides.map((o) => [key(o.date, o.meal), o.status]))
  const now = zonedNow(profile.timezone, input.now)
  const times = mealTimes(profile)

  function defaultFor(date: ISODate, meal: Meal): PlanStatus {
    const v = schedules.find((s) => s.effective_from <= date) ?? schedules[schedules.length - 1]
    if (!v) return 'taken'
    return v.pattern[weekdayMon0(date) * 3 + meal] ? 'taken' : 'skipped'
  }

  function isFinal(date: ISODate, meal: Meal): boolean {
    return date < now.date || (date === now.date && now.minutes >= times[meal])
  }

  function cell(date: ISODate, meal: Meal): MealCell {
    const def = defaultFor(date, meal)
    const ov = overrides.get(key(date, meal))
    const status = ov ?? def
    return {
      date, meal, status,
      defaultStatus: def,
      isDefault: status === def,
      isOverride: ov !== undefined,
      final: isFinal(date, meal),
      beforeStart: date < profile.start_date,
    }
  }

  return { cell, defaultFor, isFinal, today: now.date, nowMinutes: now.minutes }
}

export interface Summary {
  paidMeals: number
  consumed: number
  skipped: number
  balanceMeals: number
  balanceRupees: number
  totalPaid: number
  /** Last date with food covered by the balance, or null if balance is already ≤ 0. */
  coveredUntil: ISODate | null
  /**
   * Last date the balance lasts if every meal is eaten (weekly schedule and
   * overrides ignored), starting from the next meal still to come.
   * Null when less than one whole meal is left.
   */
  coveredUntilEveryMeal: ISODate | null
  /** The next meal still to come today or later, if any. */
  nextMeal: MealCell | null
  mealsToday: MealCell[]
  /** Number of upcoming planned meals the balance can still pay for. */
  upcomingCovered: number
}

const HORIZON_DAYS = 730

export function summarize(input: LedgerInput): Summary {
  const r = createResolver(input)
  const { profile, payments } = input

  const paidMeals = payments.reduce((s, p) => s + Number(p.meals), 0)
  const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0)

  let consumed = 0, skipped = 0
  const start = profile.start_date
  for (let d = start; d <= r.today; d = addDays(d, 1)) {
    for (const m of MEALS) {
      const c = r.cell(d, m)
      if (!c.final) continue
      if (c.status === 'taken') consumed++
      else skipped++
    }
  }

  const balanceMeals = round4(paidMeals - consumed)
  const mealsToday = MEALS.map((m) => r.cell(r.today, m))

  // Walk forward through upcoming planned meals while balance lasts.
  let remaining = balanceMeals
  let coveredUntil: ISODate | null = null
  let nextMeal: MealCell | null = null
  let upcomingCovered = 0
  const from = r.today < start ? start : r.today

  // Same end date if all 3 meals were eaten every day: fill the rest of `from`, then 3 a day.
  const split = mealsToDays(balanceMeals)
  const wholeMeals = split.days * 3 + split.meals
  const leftOnFrom = MEALS.filter((m) => !r.cell(from, m).final).length
  const coveredUntilEveryMeal: ISODate | null =
    wholeMeals === 0 ? null
    : wholeMeals <= leftOnFrom ? from
    : addDays(from, Math.ceil((wholeMeals - leftOnFrom) / 3))

  for (let i = 0, d = from; i < HORIZON_DAYS; i++, d = addDays(d, 1)) {

    for (const m of MEALS) {
      const c = r.cell(d, m)
      if (c.final) continue
      if (!nextMeal) nextMeal = c
      if (c.status !== 'taken') continue

      if (remaining >= 1 - 1e-9) {
        remaining -= 1
        upcomingCovered++
        coveredUntil = d
      } else {
        return finish()
      }
    }
  }
  return finish()

  function finish(): Summary {
    return {
      paidMeals: round4(paidMeals), consumed, skipped, balanceMeals,
      balanceRupees: round2((balanceMeals * Number(profile.rate)) / 3),
      totalPaid, coveredUntil, coveredUntilEveryMeal, nextMeal, mealsToday, upcomingCovered,
    }
  }
}

/** Per-day cells for a date range, inclusive. */
export function cellsForRange(input: LedgerInput, from: ISODate, to: ISODate): MealCell[][] {
  const r = createResolver(input)
  const out: MealCell[][] = []
  const n = diffDays(to, from)
  for (let i = 0; i <= n; i++) {
    const d = addDays(from, i)
    out.push(MEALS.map((m) => r.cell(d, m)))
  }
  return out
}

export function round2(n: number) { return Math.round(n * 100) / 100 }
export function round4(n: number) { return Math.round(n * 10000) / 10000 }

export function formatMeals(n: number): string {
  const v = round2(n)
  return Number.isInteger(v) ? String(v) : v.toFixed(v * 10 === Math.round(v * 10) ? 1 : 2)
}

/**
 * Splits a meal balance into full days (3 meals each) plus leftover meals,
 * ignoring the weekly schedule: 21 meals → 7 days, 23 meals → 7 days + 2 meals.
 * Part-meals are dropped; a zero or negative balance gives 0 days + 0 meals.
 */
export function mealsToDays(meals: number): { days: number; meals: number } {
  const whole = Math.max(0, Math.floor(meals + 1e-9))
  return { days: Math.floor(whole / 3), meals: whole % 3 }
}

export function formatRupees(n: number): string {
  return '₹' + round2(n).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: Number.isInteger(round2(n)) ? 0 : 2 })
}
