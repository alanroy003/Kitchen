import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MailCheck } from 'lucide-react'
import { supabase, friendlyError } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Alert, Button, Field } from '../components/ui'
import { Logo } from '../components/Layout'
import { useToast } from '../components/Toast'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-accent p-12 text-accent-ink lg:flex lg:flex-col lg:justify-between" aria-hidden>
        <Logo inverse />
        <div className="max-w-md">
          <p className="font-display text-[42px] leading-[1.1] font-semibold">Every meal counted. Every rupee clear.</p>
          <p className="mt-5 text-lg opacity-85">Set your weekly routine once. Lissy Kitchen marks your meals on time and tells you exactly how long your balance lasts.</p>
        </div>
        <div className="flex gap-3 opacity-90">
          {['Breakfast', 'Lunch', 'Dinner'].map((m) => (
            <span key={m} className="rounded-full border border-current/30 px-4 py-1.5 text-sm font-medium">{m}</span>
          ))}
        </div>
        <svg className="absolute -right-40 -bottom-40 size-[520px] opacity-10" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="1.5" /><circle cx="50" cy="50" r="34" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
      </aside>
      <main id="main" className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm animate-rise">
          <Logo className="mb-10 lg:hidden" />
          <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-[15px] text-muted">{subtitle}</p>
          <div className="mt-8">{children}</div>
          {footer && <p className="mt-8 text-center text-sm text-muted">{footer}</p>}
        </div>
      </main>
    </div>
  )
}

const linkCls = 'font-semibold text-accent underline-offset-4 hover:underline'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!EMAIL_RE.test(email) || !password) { setError('Enter your email and password.'); return }
    setBusy(true); setError(undefined)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (error) setError(friendlyError(error))
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to see today’s meals and your balance."
      footer={<>New here? <Link to="/signup" className={linkCls}>Create an account</Link></>}>
      <form onSubmit={submit} noValidate className="space-y-5">
        {error && <Alert>{error}</Alert>}
        <Field label="Email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        <div>
          <Field label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <div className="mt-2 text-right"><Link to="/forgot-password" className={`text-sm ${linkCls}`}>Forgot password?</Link></div>
        </div>
        <Button type="submit" loading={busy} className="w-full">Sign in</Button>
      </form>
    </AuthShell>
  )
}

export function Signup() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [sentTo, setSentTo] = useState<string>()

  async function submit(e: FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = 'Tell us what to call you.'
    if (!EMAIL_RE.test(email)) errs.email = 'Enter a valid email address.'
    if (password.length < 8) errs.password = 'Use at least 8 characters.'
    setErrors(errs)
    if (Object.keys(errs).length) return
    setBusy(true)
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(), password,
      options: { data: { full_name: name.trim() }, emailRedirectTo: window.location.origin },
    })
    setBusy(false)
    if (error) { setErrors({ form: friendlyError(error) }); return }
    if (!data.session) setSentTo(email.trim())
  }

  if (sentTo) {
    return (
      <AuthShell title="Check your inbox" subtitle={`We sent a confirmation link to ${sentTo}.`}
        footer={<>Confirmed already? <Link to="/login" className={linkCls}>Sign in</Link></>}>
        <div className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-5">
          <MailCheck className="mt-0.5 size-6 shrink-0 text-accent" aria-hidden />
          <p className="text-[15px] text-muted">Open the email and tap the link to activate your account. It may take a minute — check spam if you don’t see it.</p>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Create your account" subtitle="Your own private meal tracker. Takes 30 seconds."
      footer={<>Already have an account? <Link to="/login" className={linkCls}>Sign in</Link></>}>
      <form onSubmit={submit} noValidate className="space-y-5">
        {errors.form && <Alert>{errors.form}</Alert>}
        <Field label="Your name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} required autoFocus />
        <Field label="Email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} required />
        <Field label="Password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} hint="At least 8 characters." required />
        <Button type="submit" loading={busy} className="w-full">Create account</Button>
      </form>
    </AuthShell>
  )
}

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const [sent, setSent] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!EMAIL_RE.test(email)) { setError('Enter a valid email address.'); return }
    setBusy(true); setError(undefined)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` })
    setBusy(false)
    if (error) setError(friendlyError(error)); else setSent(true)
  }

  return (
    <AuthShell title="Reset your password" subtitle="We’ll email you a link to choose a new one."
      footer={<Link to="/login" className={linkCls}>Back to sign in</Link>}>
      {sent ? (
        <Alert kind="success">If an account exists for {email}, a reset link is on its way.</Alert>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-5">
          <Field label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={error} required autoFocus />
          <Button type="submit" loading={busy} className="w-full">Send reset link</Button>
        </form>
      )}
    </AuthShell>
  )
}

export function ResetPassword() {
  const { clearRecovering } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (password.length < 8) { setError('Use at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords don’t match.'); return }
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) { setError(friendlyError(error)); return }
    clearRecovering()
    toast.success('Password updated')
    navigate('/', { replace: true })
  }

  return (
    <AuthShell title="Choose a new password" subtitle="Pick something you don’t use elsewhere.">
      <form onSubmit={submit} noValidate className="space-y-5">
        {error && <Alert>{error}</Alert>}
        <Field label="New password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} hint="At least 8 characters." required autoFocus />
        <Field label="Confirm new password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        <Button type="submit" loading={busy} className="w-full">Save password</Button>
      </form>
    </AuthShell>
  )
}
