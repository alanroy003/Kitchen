// Calendar dates are plain 'YYYY-MM-DD' strings, interpreted in the user's
// own timezone. Arithmetic is done in UTC so DST can never shift a day.

export type ISODate = string

export function toDate(d: ISODate): Date {
  return new Date(d + 'T00:00:00Z')
}

export function fromDate(d: Date): ISODate {
  return d.toISOString().slice(0, 10)
}

export function addDays(d: ISODate, n: number): ISODate {
  const x = toDate(d)
  x.setUTCDate(x.getUTCDate() + n)
  return fromDate(x)
}

export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((toDate(a).getTime() - toDate(b).getTime()) / 86_400_000)
}

/** 0 = Monday … 6 = Sunday */
export function weekdayMon0(d: ISODate): number {
  return (toDate(d).getUTCDay() + 6) % 7
}

/** Current date and minutes-since-midnight in an IANA timezone. */
export function zonedNow(tz: string, now: Date = new Date()): { date: ISODate; minutes: number } {
  let parts: Intl.DateTimeFormatPart[]
  try {
    parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(now)
  } catch {
    return zonedNow('UTC', now)
  }
  const get = (t: string) => parts.find((p) => p.type === t)!.value
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
  }
}

/** '13:30' or '13:30:00' -> 810 */
export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + (m || 0)
}

export function formatTime(t: string): string {
  const mins = timeToMinutes(t)
  const h = Math.floor(mins / 60), m = mins % 60
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

export function formatDate(d: ISODate, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }): string {
  return toDate(d).toLocaleDateString('en-IN', { ...opts, timeZone: 'UTC' })
}

export function monthStart(d: ISODate): ISODate {
  return d.slice(0, 8) + '01'
}

export function addMonths(d: ISODate, n: number): ISODate {
  const x = toDate(monthStart(d))
  x.setUTCMonth(x.getUTCMonth() + n)
  return fromDate(x)
}

export function daysInMonth(d: ISODate): number {
  const x = toDate(monthStart(d))
  return new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth() + 1, 0)).getUTCDate()
}
