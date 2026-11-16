// DEV ONLY — renders the signed-in pages with in-memory sample data so the UI
// can be checked without logging in. Loaded only when import.meta.env.DEV.
// Open http://localhost:5173/dev?page=dashboard|calendar|payments|settings
import { useMemo, useState } from 'react'
import { DataContext, type DataState } from '../context/DataContext'
import { summarize, type Override, type Payment, type Profile, type ScheduleVersion } from '../lib/ledger'
import { addDays, zonedNow } from '../lib/dates'
import { Dashboard } from '../pages/Dashboard'
import { CalendarPage } from '../pages/Calendar'
import { PaymentsPage } from '../pages/Payments'
import { SettingsPage } from '../pages/Settings'
import { Logo } from '../components/Layout'

const PAGES = { dashboard: Dashboard, calendar: CalendarPage, payments: PaymentsPage, settings: SettingsPage }

export default function Preview() {
  const today = zonedNow('Asia/Kolkata').date
  const [profile, setProfile] = useState<Profile>({
    id: 'dev', full_name: 'Lissy Demo', timezone: 'Asia/Kolkata', start_date: addDays(today, -20),
    breakfast_time: '08:00', lunch_time: '13:00', dinner_time: '20:00', rate: 100,
  })
  const [schedules, setSchedules] = useState<ScheduleVersion[]>([
    { effective_from: '2000-01-01', pattern: Array.from({ length: 21 }, (_, i) => !(i >= 15 || i === 0 || i === 1)) },
  ])
  const [overrides, setOverrides] = useState<Override[]>([{ date: addDays(today, -2), meal: 2, status: 'skipped' }])
  const [payments, setPayments] = useState<Payment[]>([
    { id: 2, amount: 1000, rate: 100, meals: 30, paid_on: addDays(today, -10), note: 'Mid-month top up', created_at: '' },
    { id: 1, amount: 1500, rate: 100, meals: 45, paid_on: addDays(today, -20), note: 'November advance', created_at: '' },
  ])

  const input = useMemo(() => ({ profile, schedules, overrides, payments, now: new Date() }), [profile, schedules, overrides, payments])
  const summary = useMemo(() => summarize(input), [input])
  const currentPattern = schedules[0].pattern

  const value: DataState = {
    loading: false, error: null, profile, schedules, overrides, payments, input, summary, today, currentPattern,
    reload: async () => {},
    setMeal: async (date, meal, status) => setOverrides((os) => [...os.filter((o) => !(o.date === date && o.meal === meal)), { date, meal, status }]),
    resetMeal: async (date, meal) => setOverrides((os) => os.filter((o) => !(o.date === date && o.meal === meal))),
    addPayment: async (p) => { setPayments((ps) => [{ ...p, id: Date.now(), rate: profile.rate, meals: (p.amount * 3) / profile.rate, created_at: '' }, ...ps]); return true },
    deletePayment: async (id) => setPayments((ps) => ps.filter((p) => p.id !== id)),
    saveSchedule: async (pattern) => { setSchedules([{ effective_from: today, pattern }]); return true },
    updateProfile: async (patch) => { setProfile((p) => ({ ...p, ...patch })); return true },
  }

  const page = (new URLSearchParams(location.search).get('page') ?? 'dashboard') as keyof typeof PAGES
  const Page = PAGES[page] ?? Dashboard
  return (
    <DataContext.Provider value={value}>
      <div className="min-h-dvh">
        <header className="border-b border-line/70 bg-bg/85"><div className="mx-auto flex h-16 max-w-5xl items-center px-4 sm:px-6"><Logo /><span className="ml-3 rounded-full bg-warn-soft px-2 py-0.5 text-xs font-semibold text-warn">DEV PREVIEW</span></div></header>
        <main id="main" className="mx-auto max-w-5xl px-4 pb-28 pt-6 sm:px-6 sm:pt-10"><Page /></main>
      </div>
    </DataContext.Provider>
  )
}
