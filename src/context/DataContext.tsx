import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase, friendlyError } from '../lib/supabase'
import { createResolver, summarize, MEAL_NAMES, type LedgerInput, type Meal, type Override, type Payment, type PlanStatus, type Profile, type ScheduleVersion, type Summary } from '../lib/ledger'
import { formatDate, zonedNow, type ISODate } from '../lib/dates'
import { useAuth } from './AuthContext'
import { useToast } from '../components/Toast'

export interface DataState {
  loading: boolean
  error: string | null
  profile: Profile
  schedules: ScheduleVersion[]
  overrides: Override[]
  payments: Payment[]
  input: LedgerInput
  summary: Summary
  today: ISODate
  setMeal: (date: ISODate, meal: Meal, status: PlanStatus) => Promise<void>
  resetMeal: (date: ISODate, meal: Meal) => Promise<void>
  addPayment: (p: { amount: number; paid_on: ISODate; note: string }) => Promise<boolean>
  deletePayment: (id: number) => Promise<void>
  saveSchedule: (pattern: boolean[]) => Promise<boolean>
  updateProfile: (patch: Partial<Omit<Profile, 'id'>>) => Promise<boolean>
  currentPattern: boolean[]
  reload: () => Promise<void>
}

export const DataContext = createContext<DataState | null>(null)

/** Re-render every 30 s so meals flip to "final" on their own at meal time. */
function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    const onVis = () => document.visibilityState === 'visible' && setNow(new Date())
    document.addEventListener('visibilitychange', onVis)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVis) }
  }, [])
  return now
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const toast = useToast()
  const now = useNow()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [schedules, setSchedules] = useState<ScheduleVersion[]>([])
  const [overrides, setOverrides] = useState<Override[]>([])
  const [payments, setPayments] = useState<Payment[]>([])

  const reload = useCallback(async () => {
    if (!session) return
    setError(null)
    const [p, s, o, pay] = await Promise.all([
      supabase.from('profiles').select('*').single(),
      supabase.from('schedule_versions').select('effective_from, pattern').order('effective_from', { ascending: false }),
      supabase.from('meal_overrides').select('date, meal, status'),
      supabase.from('payments').select('*').order('paid_on', { ascending: false }).order('created_at', { ascending: false }),
    ])
    const err = p.error || s.error || o.error || pay.error
    if (err) { setError(friendlyError(err)); setLoading(false); return }
    setProfile({ ...p.data, rate: Number(p.data.rate) } as Profile)
    setSchedules(s.data as ScheduleVersion[])
    setOverrides(o.data as Override[])
    setPayments((pay.data as Payment[]).map((x) => ({ ...x, amount: Number(x.amount), rate: Number(x.rate), meals: Number(x.meals) })))
    setLoading(false)
  }, [session])

  useEffect(() => { void reload() }, [reload])

  const fallbackProfile: Profile = useMemo(() => ({
    id: '', full_name: '', timezone: 'Asia/Kolkata', start_date: '2000-01-01',
    breakfast_time: '08:00', lunch_time: '13:00', dinner_time: '20:00', rate: 100,
  }), [])
  const prof = profile ?? fallbackProfile

  const input: LedgerInput = useMemo(
    () => ({ profile: prof, schedules, overrides, payments, now }),
    [prof, schedules, overrides, payments, now],
  )
  const summary = useMemo(() => summarize(input), [input])
  const today = useMemo(() => zonedNow(prof.timezone, now).date, [prof.timezone, now])
  const currentPattern = useMemo(() => {
    const v = [...schedules].sort((a, b) => (a.effective_from < b.effective_from ? 1 : -1)).find((x) => x.effective_from <= today)
    return v?.pattern ?? Array(21).fill(true)
  }, [schedules, today])

  /** Optimistically sets a meal's status. An override equal to the default is deleted instead of stored. */
  const applyMeal = useCallback(async (date: ISODate, meal: Meal, status: PlanStatus | null) => {
    const r = createResolver(input)
    const before = r.cell(date, meal)
    const def = before.defaultStatus
    const target = status ?? def
    const prev = overrides
    const rest = overrides.filter((x) => !(x.date === date && x.meal === meal))
    const store = target !== def
    setOverrides(store ? [...rest, { date, meal, status: target }] : rest)
    const { error } = store
      ? await supabase.from('meal_overrides').upsert({ date, meal, status: target }, { onConflict: 'user_id,date,meal' })
      : await supabase.from('meal_overrides').delete().match({ date, meal })
    if (error) { setOverrides(prev); toast.error(friendlyError(error)); return }
    // Editing a meal whose time has passed changes the balance: say so.
    if (before.final && !before.beforeStart && before.status !== target) {
      const when = date === r.today ? 'today' : formatDate(date)
      toast.success(`${MEAL_NAMES[meal]} · ${when} marked ${target === 'taken' ? 'eaten — 1 meal charged' : 'skipped — 1 meal refunded'}`)
    }
  }, [input, overrides, toast])

  const setMeal = useCallback((date: ISODate, meal: Meal, status: PlanStatus) => applyMeal(date, meal, status), [applyMeal])
  const resetMeal = useCallback((date: ISODate, meal: Meal) => applyMeal(date, meal, null), [applyMeal])

  const addPayment = useCallback(async (p: { amount: number; paid_on: ISODate; note: string }) => {
    const { data, error } = await supabase.from('payments').insert({ ...p, rate: prof.rate }).select().single()
    if (error) { toast.error(friendlyError(error)); return false }
    const row = { ...data, amount: Number(data.amount), rate: Number(data.rate), meals: Number(data.meals) } as Payment
    setPayments((ps) => [row, ...ps].sort((a, b) => (a.paid_on < b.paid_on ? 1 : a.paid_on > b.paid_on ? -1 : b.created_at.localeCompare(a.created_at))))
    return true
  }, [prof.rate, toast])

  const deletePayment = useCallback(async (id: number) => {
    const prev = payments
    setPayments((ps) => ps.filter((x) => x.id !== id))
    const { error } = await supabase.from('payments').delete().eq('id', id)
    if (error) { setPayments(prev); toast.error(friendlyError(error)) }
  }, [payments, toast])

  const saveSchedule = useCallback(async (pattern: boolean[]) => {
    const { error } = await supabase.from('schedule_versions')
      .upsert({ effective_from: today, pattern }, { onConflict: 'user_id,effective_from' })
    if (error) { toast.error(friendlyError(error)); return false }
    setSchedules((ss) => [{ effective_from: today, pattern }, ...ss.filter((s) => s.effective_from !== today)])
    return true
  }, [today, toast])

  const updateProfile = useCallback(async (patch: Partial<Omit<Profile, 'id'>>) => {
    const { data, error } = await supabase.from('profiles').update(patch).eq('id', prof.id).select().single()
    if (error) { toast.error(friendlyError(error)); return false }
    setProfile({ ...data, rate: Number(data.rate) } as Profile)
    return true
  }, [prof.id, toast])

  const value: DataState = {
    loading, error, profile: prof, schedules, overrides, payments, input, summary, today,
    setMeal, resetMeal, addPayment, deletePayment, saveSchedule, updateProfile, currentPattern, reload,
  }
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData outside DataProvider')
  return ctx
}
