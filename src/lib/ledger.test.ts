import { test } from 'node:test'
import assert from 'node:assert/strict'
import { summarize, createResolver, formatMeals, formatRupees, mealsToDays, type LedgerInput, type Profile } from './ledger.ts'
import { weekdayMon0, zonedNow, addDays } from './dates.ts'

const profile: Profile = {
  id: 'u', full_name: 'T', timezone: 'Asia/Kolkata', start_date: '2026-11-16', // a Monday
  breakfast_time: '08:00', lunch_time: '13:00', dinner_time: '20:00', rate: 100,
}
const all = Array(21).fill(true)
// No weekend food, no Monday breakfast/lunch.
const custom = all.map((_, i) => !(i >= 15 || i === 0 || i === 1))

// 2026-11-16 10:00 IST = 04:30 UTC
const at = (iso: string) => new Date(iso)

function input(over: Partial<LedgerInput> = {}): LedgerInput {
  return {
    profile, schedules: [{ effective_from: '2000-01-01', pattern: all }],
    overrides: [], payments: [{ id: 1, amount: 1000, rate: 100, meals: 30, paid_on: '2026-11-16', note: '', created_at: '' }],
    now: at('2026-11-16T04:30:00Z'), ...over,
  }
}

test('dates helpers', () => {
  assert.equal(weekdayMon0('2026-11-16'), 0)
  assert.equal(weekdayMon0('2026-11-22'), 6)
  assert.deepEqual(zonedNow('Asia/Kolkata', at('2026-11-16T04:30:00Z')), { date: '2026-11-16', minutes: 600 })
  assert.equal(addDays('2026-02-28', 1), '2026-03-01')
})

test('breakfast passed at 10am counts automatically', () => {
  const s = summarize(input())
  assert.equal(s.consumed, 1)
  assert.equal(s.balanceMeals, 29)
  assert.equal(s.balanceRupees, 966.67)
  assert.equal(s.nextMeal?.meal, 1)
})

test('skipped-by-default meal costs nothing', () => {
  const s = summarize(input({ schedules: [{ effective_from: '2000-01-01', pattern: custom }] }))
  assert.equal(s.consumed, 0)
  assert.equal(s.skipped, 1)
})

test('override after the fact refunds the meal', () => {
  const s = summarize(input({ overrides: [{ date: '2026-11-16', meal: 0, status: 'skipped' }] }))
  assert.equal(s.consumed, 0)
  assert.equal(s.balanceMeals, 30)
})

test('₹250 = 7.5 meals; projection stops when < 1 meal left', () => {
  const s = summarize(input({ payments: [{ id: 1, amount: 250, rate: 100, meals: 7.5, paid_on: '2026-11-16', note: '', created_at: '' }] }))
  assert.equal(s.balanceMeals, 6.5)
  assert.equal(s.upcomingCovered, 6) // lunch+dinner today, 3 tue, breakfast wed
  assert.equal(s.coveredUntil, '2026-11-18')
})

test('skipped days push the end date out', () => {
  const a = summarize(input()).coveredUntil!
  const b = summarize(input({ schedules: [{ effective_from: '2000-01-01', pattern: custom }] })).coveredUntil!
  assert.ok(b > a, `${b} should be after ${a}`)
})

test('schedule versions do not rewrite history', () => {
  const r = createResolver(input({
    schedules: [
      { effective_from: '2000-01-01', pattern: all },
      { effective_from: '2026-11-20', pattern: custom },
    ],
  }))
  assert.equal(r.cell('2026-11-16', 0).status, 'taken')  // old version
  assert.equal(r.cell('2026-11-23', 0).status, 'skipped') // new version, a Monday
})

test('days before start date are ignored', () => {
  const s = summarize(input({ now: at('2026-11-17T04:30:00Z'), profile: { ...profile, start_date: '2026-11-17' } }))
  assert.equal(s.consumed, 1)
})

test('formatting', () => {
  assert.equal(formatMeals(7.5), '7.5')
  assert.equal(formatMeals(29), '29')
  assert.equal(formatRupees(966.67), '₹966.67')
  assert.equal(formatRupees(1000), '₹1,000')
})

test('mealsToDays splits balance into 3-meal days, ignoring the schedule', () => {
  assert.deepEqual(mealsToDays(21), { days: 7, meals: 0 })
  assert.deepEqual(mealsToDays(23), { days: 7, meals: 2 })
  assert.deepEqual(mealsToDays(22), { days: 7, meals: 1 })
  assert.deepEqual(mealsToDays(2), { days: 0, meals: 2 })
  assert.deepEqual(mealsToDays(6.5), { days: 2, meals: 0 })
  assert.deepEqual(mealsToDays(0), { days: 0, meals: 0 })
  assert.deepEqual(mealsToDays(-4), { days: 0, meals: 0 })
  // A ₹700 balance at ₹100/day is 21 meals, even if the schedule skips some.
  const s = summarize(input({
    schedules: [{ effective_from: '2000-01-01', pattern: custom }],
    payments: [{ id: 1, amount: 700, rate: 100, meals: 21, paid_on: '2026-11-16', note: '', created_at: '' }],
  }))
  assert.equal(s.balanceRupees, 700)
  assert.deepEqual(mealsToDays(s.balanceMeals), { days: 7, meals: 0 })
})

test('coveredUntilEveryMeal ignores the schedule and counts 3 meals a day', () => {
  const pay = (meals: number) => [{ id: 1, amount: 0, rate: 100, meals, paid_on: '2026-11-16', note: '', created_at: '' }]
  const skipping = [{ effective_from: '2000-01-01', pattern: custom }]
  // Mon 16 Nov 10:00: breakfast is over (and skipped), lunch + dinner still to come today.
  const s = summarize(input({ schedules: skipping, payments: pay(21) }))
  assert.equal(s.balanceMeals, 21)
  assert.equal(s.coveredUntilEveryMeal, '2026-11-23') // lunch+dinner today, Tue–Sun, Mon breakfast
  assert.ok(s.coveredUntil! > s.coveredUntilEveryMeal!) // the schedule-based date is pushed out by skips
  assert.equal(summarize(input({ schedules: skipping, payments: pay(2) })).coveredUntilEveryMeal, '2026-11-16')
  assert.equal(summarize(input({ schedules: skipping, payments: pay(3) })).coveredUntilEveryMeal, '2026-11-17')
  assert.equal(summarize(input({ schedules: skipping, payments: pay(0.5) })).coveredUntilEveryMeal, null)
  // After dinner (20:30 IST) nothing is left today: 21 meals = Tue 17 – Mon 23.
  const late = summarize(input({ schedules: skipping, payments: pay(22), now: at('2026-11-16T15:00:00Z') }))
  assert.equal(late.balanceMeals, 21)
  assert.equal(late.coveredUntilEveryMeal, '2026-11-23')
  // Tracking starts later: count from the start date's breakfast.
  const later = summarize(input({ profile: { ...profile, start_date: '2026-11-20' }, payments: pay(21) }))
  assert.equal(later.coveredUntilEveryMeal, '2026-11-26')
})
