import { forwardRef, useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-accent-ink hover:bg-accent-hover',
  secondary: 'bg-surface text-ink border border-line hover:bg-surface-2',
  ghost: 'text-ink hover:bg-surface-2',
  danger: 'bg-danger text-white hover:opacity-90 dark:text-[#1b1a17]',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  loading?: boolean
  size?: 'md' | 'sm'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', loading, size = 'md', className = '', children, disabled, ...rest }, ref,
) {
  return (
    <button ref={ref} disabled={disabled || loading} aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${size === 'md' ? 'min-h-11 px-5 text-[15px]' : 'min-h-9 px-3.5 text-sm'} ${variants[variant]} ${className}`}
      {...rest}>
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
})

export function Card({ children, className = '', as: As = 'section', ...rest }: { children: ReactNode; className?: string; as?: 'section' | 'div' | 'article'; 'aria-labelledby'?: string }) {
  return <As className={`rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6 ${className}`} {...rest}>{children}</As>
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
  error?: string
  suffix?: ReactNode
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field({ label, hint, error, suffix, className = '', type, ...rest }, ref) {
  const id = useId()
  const [show, setShow] = useState(false)
  const isPassword = type === 'password'
  const describedBy = [hint && `${id}-hint`, error && `${id}-err`].filter(Boolean).join(' ') || undefined
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">{label}</label>
      <div className="relative">
        <input ref={ref} id={id} type={isPassword && show ? 'text' : type}
          aria-invalid={error ? true : undefined} aria-describedby={describedBy}
          className={`block min-h-11 w-full rounded-xl border bg-surface px-3.5 text-[15px] text-ink placeholder:text-muted/70 transition-colors focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/20 ${error ? 'border-danger' : 'border-line'} ${isPassword || suffix ? 'pr-12' : ''}`}
          {...rest} />
        {isPassword && (
          <button type="button" onClick={() => setShow((s) => !s)}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted hover:text-ink"
            aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show}>
            {show ? <EyeOff className="size-[18px]" aria-hidden /> : <Eye className="size-[18px]" aria-hidden />}
          </button>
        )}
        {suffix && !isPassword && <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-sm text-muted">{suffix}</span>}
      </div>
      {hint && !error && <p id={`${id}-hint`} className="mt-1.5 text-[13px] text-muted">{hint}</p>}
      {error && <p id={`${id}-err`} className="mt-1.5 text-[13px] font-medium text-danger">{error}</p>}
    </div>
  )
})

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-16 text-muted">
      <Loader2 className="size-5 animate-spin" aria-hidden />
      <span className="text-sm">{label}…</span>
    </div>
  )
}

export function Alert({ kind = 'error', children }: { kind?: 'error' | 'success' | 'info'; children: ReactNode }) {
  const styles = { error: 'bg-danger-soft text-danger', success: 'bg-ok-soft text-ok', info: 'bg-surface-2 text-ink' }[kind]
  return <div role={kind === 'error' ? 'alert' : 'status'} className={`rounded-xl px-4 py-3 text-sm font-medium ${styles}`}>{children}</div>
}

/** Modal built on native <dialog>: focus trap, Esc to close, backdrop click. */
export function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog ref={ref} aria-labelledby={titleId}
      onCancel={(e) => { e.preventDefault(); onClose() }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="mx-auto mb-0 mt-auto w-full max-w-md rounded-t-3xl border border-line bg-surface p-0 text-ink shadow-card sm:m-auto sm:rounded-2xl">
      {open && (
        <div className="animate-rise p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 id={titleId} className="font-display text-xl font-semibold">{title}</h2>
            <button onClick={onClose} className="min-h-9 rounded-lg px-2.5 text-sm font-semibold text-muted hover:bg-surface-2 hover:text-ink">Close</button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  )
}

/** Accessible confirm dialog built on the native <dialog> element. */
export function ConfirmDialog({ open, title, body, confirmLabel, onConfirm, onCancel, danger }: {
  open: boolean; title: string; body: ReactNode; confirmLabel: string; danger?: boolean
  onConfirm: () => void; onCancel: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  const titleId = useId()
  return (
    <dialog ref={ref} aria-labelledby={titleId} onCancel={(e) => { e.preventDefault(); onCancel() }}
      className="m-auto w-[min(92vw,26rem)] rounded-2xl border border-line bg-surface p-6 text-ink shadow-card">
      <h2 id={titleId} className="font-display text-xl font-semibold">{title}</h2>
      <div className="mt-2 text-[15px] text-muted">{body}</div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} autoFocus>Cancel</Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </dialog>
  )
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-[34px]">{title}</h1>
        {subtitle && <p className="mt-1 text-[15px] text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
