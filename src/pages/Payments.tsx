import { useState } from 'react'
import { Receipt, Trash2 } from 'lucide-react'
import { useData } from '../context/DataContext'
import { Card, ConfirmDialog, PageHeader } from '../components/ui'
import { PaymentForm } from '../components/PaymentForm'
import { useToast } from '../components/Toast'
import { formatMeals, formatRupees, type Payment } from '../lib/ledger'
import { formatDate } from '../lib/dates'

export function PaymentsPage() {
  const { payments, summary, deletePayment } = useData()
  const toast = useToast()
  const [toDelete, setToDelete] = useState<Payment | null>(null)

  return (
    <div className="animate-rise">
      <PageHeader title="Payments" subtitle="Every rupee you’ve paid to the mess, converted to meals." />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <Card aria-labelledby="add-h" className="h-fit">
          <h2 id="add-h" className="mb-5 text-lg font-semibold">Add a payment</h2>
          <PaymentForm compact />
        </Card>

        <Card aria-labelledby="hist-h">
          <div className="flex items-end justify-between gap-3">
            <h2 id="hist-h" className="text-lg font-semibold">History</h2>
            <p className="text-sm text-muted">Total <span className="font-semibold text-ink tabular">{formatRupees(summary.totalPaid)}</span> · {formatMeals(summary.paidMeals)} meals</p>
          </div>

          {payments.length === 0 ? (
            <div className="mt-6 flex flex-col items-center rounded-xl border border-dashed border-line px-6 py-12 text-center">
              <Receipt className="size-8 text-muted" aria-hidden />
              <p className="mt-3 font-semibold">No payments yet</p>
              <p className="mt-1 text-sm text-muted">Add what you’ve paid so far to start your balance.</p>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {payments.map((p) => (
                <li key={p.id} className="flex items-center gap-4 py-3.5">
                  <div className="flex size-11 shrink-0 flex-col items-center justify-center rounded-xl bg-surface-2 leading-none">
                    <span className="text-[15px] font-bold tabular">{p.paid_on.slice(8)}</span>
                    <span className="mt-0.5 text-[10px] font-semibold uppercase text-muted">{formatDate(p.paid_on, { month: 'short' })}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold tabular">{formatRupees(p.amount)}</p>
                    <p className="truncate text-sm text-muted">
                      {formatMeals(p.meals)} meals{p.note ? ` · ${p.note}` : ''}
                      {p.rate !== 100 && <> · at {formatRupees(p.rate)}/3</>}
                    </p>
                  </div>
                  <button onClick={() => setToDelete(p)} className="flex size-10 items-center justify-center rounded-xl text-muted hover:bg-danger-soft hover:text-danger"
                    aria-label={`Delete payment of ${formatRupees(p.amount)} on ${formatDate(p.paid_on, { day: 'numeric', month: 'long', year: 'numeric' })}`}>
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <ConfirmDialog open={!!toDelete} danger confirmLabel="Delete payment" title="Delete this payment?"
        body={toDelete && <>{formatRupees(toDelete.amount)} ({formatMeals(toDelete.meals)} meals) on {formatDate(toDelete.paid_on, { day: 'numeric', month: 'long' })} will be removed and your balance will drop by that much.</>}
        onCancel={() => setToDelete(null)}
        onConfirm={async () => { const p = toDelete!; setToDelete(null); await deletePayment(p.id); toast.success('Payment deleted') }} />
    </div>
  )
}
