import { useState, type FormEvent } from 'react'
import { Button, Field } from './ui'
import { useData } from '../context/DataContext'
import { useToast } from './Toast'
import { formatMeals, formatRupees } from '../lib/ledger'

export function PaymentForm({ onDone, compact }: { onDone?: () => void; compact?: boolean }) {
  const { addPayment, today, profile } = useData()
  const toast = useToast()
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(today)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  const value = Number(amount)
  const valid = amount !== '' && Number.isFinite(value) && value > 0 && value <= 1_000_000
  const meals = valid ? (value * 3) / profile.rate : 0

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!valid) { setError('Enter an amount greater than 0.'); return }
    setBusy(true)
    const ok = await addPayment({ amount: Math.round(value * 100) / 100, paid_on: date, note: note.trim() })
    setBusy(false)
    if (ok) {
      toast.success(`Added ${formatRupees(value)} · ${formatMeals(meals)} meals`)
      setAmount(''); setNote(''); setError(undefined)
      onDone?.()
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div className={compact ? 'space-y-4' : 'grid gap-4 sm:grid-cols-2'}>
        <Field label="Amount paid" type="number" inputMode="decimal" min="1" step="any" placeholder="1000"
          value={amount} onChange={(e) => { setAmount(e.target.value); setError(undefined) }} error={error} suffix="₹"
          hint={valid ? `= ${formatMeals(meals)} meals at ${formatRupees(profile.rate)} per 3 meals` : `${formatRupees(profile.rate)} buys 3 meals`}
          required autoFocus={compact} />
        <Field label="Date" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} required />
      </div>
      <Field label="Note (optional)" placeholder="e.g. November advance" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} />
      <Button type="submit" loading={busy} className="w-full sm:w-auto">Add payment</Button>
    </form>
  )
}
