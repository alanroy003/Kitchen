import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Check, LogOut, Monitor, Moon, Sun } from 'lucide-react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { supabase, friendlyError } from '../lib/supabase'
import { Button, Card, Field, PageHeader } from '../components/ui'
import { useToast } from '../components/Toast'
import { DAY_NAMES, MEAL_NAMES, formatRupees } from '../lib/ledger'
import { useTheme, type Theme } from '../lib/theme'

export function SettingsPage() {
  return (
    <div className="animate-rise space-y-6">
      <PageHeader title="Settings" subtitle="Your weekly routine, meal times and account." />
      <ScheduleMatrix />
      <div className="grid gap-6 lg:grid-cols-2">
        <MealTimes />
        <Profile />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Appearance />
        <Account />
      </div>
    </div>
  )
}

/* ─── Weekly default matrix ─────────────────────────────────────────────── */

function ScheduleMatrix() {
  const { currentPattern, saveSchedule } = useData()
  const toast = useToast()
  const [pattern, setPattern] = useState<boolean[]>(currentPattern)
  const [busy, setBusy] = useState(false)
  useEffect(() => setPattern(currentPattern), [currentPattern])

  const dirty = pattern.some((v, i) => v !== currentPattern[i])
  const perWeek = pattern.filter(Boolean).length
  const toggle = (i: number) => setPattern((p) => p.map((v, j) => (j === i ? !v : v)))
  const setRow = (d: number, v: boolean) => setPattern((p) => p.map((x, j) => (Math.floor(j / 3) === d ? v : x)))
  const setCol = (m: number, v: boolean) => setPattern((p) => p.map((x, j) => (j % 3 === m ? v : x)))

  async function save() {
    setBusy(true)
    const ok = await saveSchedule(pattern)
    setBusy(false)
    if (ok) toast.success('Weekly schedule saved')
  }

  return (
    <Card aria-labelledby="sched-h">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <h2 id="sched-h" className="text-lg font-semibold">Weekly default</h2>
          <p className="mt-1 text-sm text-muted">
            Tick the meals you normally eat. These are marked <strong className="font-semibold text-ink">eaten</strong> automatically once their time passes; unticked ones are marked <strong className="font-semibold text-ink">not needed</strong>. You can still change any single day from the dashboard.
          </p>
        </div>
        <p className="rounded-full bg-surface-2 px-3 py-1 text-sm font-semibold tabular" aria-live="polite">{perWeek} meals / week</p>
      </div>

      <div className="-mx-1.5 mt-6">
        <table className="w-full table-fixed border-separate border-spacing-1 sm:border-spacing-1.5">
          <caption className="sr-only">Weekly meal schedule. Rows are days, columns are meals.</caption>
          <thead>
            <tr>
              <th scope="col" className="w-14 text-left text-xs sm:w-32 font-semibold uppercase tracking-wider text-muted"><span className="sr-only">Day</span></th>
              {MEAL_NAMES.map((m, mi) => {
                const all = [0, 1, 2, 3, 4, 5, 6].every((d) => pattern[d * 3 + mi])
                return (
                  <th key={m} scope="col" className="text-center">
                    <button onClick={() => setCol(mi, !all)} className="min-h-9 w-full rounded-lg px-2 text-xs font-semibold uppercase tracking-wider text-muted hover:bg-surface-2 hover:text-ink"
                      aria-label={`${all ? 'Untick' : 'Tick'} ${m} for every day`}><span className="sm:hidden">{m === 'Breakfast' ? 'Bkfst' : m}</span><span className="hidden sm:inline">{m}</span></button>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {DAY_NAMES.map((day, d) => {
              const allDay = [0, 1, 2].every((m) => pattern[d * 3 + m])
              return (
                <tr key={day}>
                  <th scope="row" className="text-left">
                    <button onClick={() => setRow(d, !allDay)} className="min-h-11 w-full rounded-lg px-2 text-left text-sm font-semibold hover:bg-surface-2"
                      aria-label={`${allDay ? 'Untick' : 'Tick'} all meals on ${day}`}>
                      <span className="sm:hidden">{day.slice(0, 3)}</span><span className="hidden sm:inline">{day}</span>
                    </button>
                  </th>
                  {[0, 1, 2].map((m) => {
                    const i = d * 3 + m
                    const on = pattern[i]
                    return (
                      <td key={m}>
                        <label className={`flex min-h-11 cursor-pointer items-center justify-center rounded-xl border transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${on ? 'border-accent/40 bg-accent-soft text-accent' : 'border-line bg-surface text-muted hover:bg-surface-2'}`}>
                          <input type="checkbox" className="sr-only" checked={on} onChange={() => toggle(i)} aria-label={`${day} ${MEAL_NAMES[m]}`} />
                          {on ? <Check className="size-5" aria-hidden /> : <span className="text-xs font-medium">Off</span>}
                        </label>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
        <p className="text-sm text-muted">Applies from today. Past days keep the schedule they had.</p>
        <div className="flex gap-2">
          {dirty && <Button variant="ghost" onClick={() => setPattern(currentPattern)}>Discard</Button>}
          <Button onClick={save} loading={busy} disabled={!dirty}>Save schedule</Button>
        </div>
      </div>
    </Card>
  )
}

/* ─── Meal times & price ────────────────────────────────────────────────── */

function MealTimes() {
  const { profile, updateProfile } = useData()
  const toast = useToast()
  const [b, setB] = useState(profile.breakfast_time.slice(0, 5))
  const [l, setL] = useState(profile.lunch_time.slice(0, 5))
  const [d, setD] = useState(profile.dinner_time.slice(0, 5))
  const [rate, setRate] = useState(String(profile.rate))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!(b < l && l < d)) { setError('Times must be in order: breakfast, then lunch, then dinner.'); return }
    const r = Number(rate)
    if (!(r > 0)) { setError('Price must be greater than 0.'); return }
    setError(undefined); setBusy(true)
    const ok = await updateProfile({ breakfast_time: b, lunch_time: l, dinner_time: d, rate: r })
    setBusy(false)
    if (ok) toast.success('Meal settings saved')
  }

  return (
    <Card aria-labelledby="times-h">
      <h2 id="times-h" className="text-lg font-semibold">Meal times & price</h2>
      <p className="mt-1 text-sm text-muted">A meal is counted automatically once its time passes.</p>
      <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Breakfast" type="time" value={b} onChange={(e) => setB(e.target.value)} required />
          <Field label="Lunch" type="time" value={l} onChange={(e) => setL(e.target.value)} required />
          <Field label="Dinner" type="time" value={d} onChange={(e) => setD(e.target.value)} required />
        </div>
        <Field label="Price for 3 meals" type="number" inputMode="decimal" min="1" step="any" suffix="₹" value={rate} onChange={(e) => setRate(e.target.value)}
          hint={`Used for new payments. Currently ${formatRupees(Number(rate) || 0)} = 3 meals.`} error={error} />
        <Button type="submit" loading={busy}>Save</Button>
      </form>
    </Card>
  )
}

/* ─── Profile ───────────────────────────────────────────────────────────── */

function Profile() {
  const { profile, updateProfile, today } = useData()
  const toast = useToast()
  const [name, setName] = useState(profile.full_name)
  const [start, setStart] = useState(profile.start_date)
  const [tz, setTz] = useState(profile.timezone)
  const [busy, setBusy] = useState(false)
  const zones = useMemo(() => {
    try { return (Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf('timeZone') } catch { return ['Asia/Kolkata', 'UTC'] }
  }, [])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    const ok = await updateProfile({ full_name: name.trim(), start_date: start, timezone: tz })
    setBusy(false)
    if (ok) toast.success('Profile saved')
  }

  return (
    <Card aria-labelledby="prof-h">
      <h2 id="prof-h" className="text-lg font-semibold">Profile</h2>
      <p className="mt-1 text-sm text-muted">Meals are only counted from your start date.</p>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        <Field label="Tracking start date" type="date" value={start} max={today} onChange={(e) => setStart(e.target.value)} required />
        <div>
          <label htmlFor="tz" className="mb-1.5 block text-sm font-medium">Timezone</label>
          <select id="tz" value={tz} onChange={(e) => setTz(e.target.value)}
            className="block min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-[15px] focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/20">
            {zones.map((z) => <option key={z} value={z}>{z.replaceAll('_', ' ')}</option>)}
          </select>
        </div>
        <Button type="submit" loading={busy}>Save profile</Button>
      </form>
    </Card>
  )
}

/* ─── Appearance ────────────────────────────────────────────────────────── */

function Appearance() {
  const [theme, setTheme] = useTheme()
  const opts: { v: Theme; label: string; icon: typeof Sun }[] = [
    { v: 'light', label: 'Light', icon: Sun }, { v: 'dark', label: 'Dark', icon: Moon }, { v: 'system', label: 'System', icon: Monitor },
  ]
  return (
    <Card aria-labelledby="app-h">
      <h2 id="app-h" className="text-lg font-semibold">Appearance</h2>
      <fieldset className="mt-5">
        <legend className="sr-only">Theme</legend>
        <div className="grid grid-cols-3 gap-2">
          {opts.map(({ v, label, icon: Icon }) => (
            <label key={v} className={`flex min-h-20 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${theme === v ? 'border-accent bg-accent-soft text-accent' : 'border-line hover:bg-surface-2'}`}>
              <input type="radio" name="theme" value={v} checked={theme === v} onChange={() => setTheme(v)} className="sr-only" />
              <Icon className="size-5" aria-hidden />{label}
            </label>
          ))}
        </div>
      </fieldset>
    </Card>
  )
}

/* ─── Account ───────────────────────────────────────────────────────────── */

function Account() {
  const { session } = useAuth()
  const toast = useToast()
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  async function change(e: FormEvent) {
    e.preventDefault()
    if (pw.length < 8) { setError('Use at least 8 characters.'); return }
    setBusy(true); setError(undefined)
    const { error } = await supabase.auth.updateUser({ password: pw })
    setBusy(false)
    if (error) setError(friendlyError(error))
    else { setPw(''); toast.success('Password changed') }
  }

  return (
    <Card aria-labelledby="acct-h">
      <h2 id="acct-h" className="text-lg font-semibold">Account</h2>
      <p className="mt-1 truncate text-sm text-muted">Signed in as <span className="font-semibold text-ink">{session?.user.email}</span></p>
      <form onSubmit={change} className="mt-5 space-y-4" noValidate>
        <Field label="New password" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} error={error} />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="secondary" loading={busy}>Change password</Button>
          <Button type="button" variant="ghost" onClick={() => supabase.auth.signOut()}>
            <LogOut className="size-4" aria-hidden /> Sign out
          </Button>
        </div>
      </form>
    </Card>
  )
}
