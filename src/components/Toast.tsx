import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { CheckCircle2, AlertCircle, X } from 'lucide-react'

type Kind = 'success' | 'error'
interface Toast { id: number; kind: Kind; text: string }
interface ToastApi { success: (t: string) => void; error: (t: string) => void }

const ToastContext = createContext<ToastApi | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => setToasts((ts) => ts.filter((t) => t.id !== id)), [])
  const push = useCallback((kind: Kind, text: string) => {
    const id = nextId.current++
    setToasts((ts) => [...ts.slice(-2), { id, kind, text }])
    setTimeout(() => dismiss(id), kind === 'error' ? 6000 : 3000)
  }, [dismiss])

  const api = useMemo(() => ({ success: (t: string) => push('success', t), error: (t: string) => push('error', t) }), [push])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 sm:bottom-6" aria-live="polite" aria-atomic="false">
        {toasts.map((t) => (
          <div key={t.id} role={t.kind === 'error' ? 'alert' : 'status'}
            className="animate-rise pointer-events-auto flex max-w-md items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm shadow-card">
            {t.kind === 'success'
              ? <CheckCircle2 className="size-5 shrink-0 text-ok" aria-hidden />
              : <AlertCircle className="size-5 shrink-0 text-danger" aria-hidden />}
            <span className="flex-1">{t.text}</span>
            <button onClick={() => dismiss(t.id)} className="rounded-md p-1 text-muted hover:text-ink" aria-label="Dismiss notification">
              <X className="size-4" aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast outside ToastProvider')
  return ctx
}
