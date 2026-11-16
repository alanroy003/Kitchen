import { NavLink, Outlet } from 'react-router-dom'
import { CalendarDays, Home, Settings, Wallet } from 'lucide-react'
import { useData } from '../context/DataContext'
import { Alert, Button, Spinner } from './ui'

const NAV = [
  { to: '/', label: 'Today', icon: Home, end: true },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/payments', label: 'Payments', icon: Wallet },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function Logo({ className = '', inverse }: { className?: string; inverse?: boolean }) {
  const bg = inverse ? 'var(--accent-ink)' : 'var(--accent)'
  const fg = inverse ? 'var(--accent)' : 'var(--accent-ink)'
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg viewBox="0 0 64 64" className="size-8" aria-hidden>
        <circle cx="32" cy="32" r="30" fill={bg} />
        <circle cx="32" cy="32" r="21" fill="none" stroke={fg} strokeWidth="3" />
        <circle cx="24" cy="27" r="5" fill={fg} />
        <circle cx="40" cy="27" r="5" fill={fg} />
        <circle cx="32" cy="41" r="5" fill={fg} />
      </svg>
      <span className="font-display text-xl font-semibold tracking-tight">Lissy Kitchen</span>
    </span>
  )
}

export function Layout() {
  const { loading, error, reload } = useData()
  return (
    <div className="min-h-dvh">
      <a href="#main" className="sr-only z-50 rounded-lg bg-accent px-4 py-2 text-accent-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <NavLink to="/" aria-label="Lissy Kitchen home"><Logo /></NavLink>
          <nav aria-label="Main" className="hidden sm:block">
            <ul className="flex gap-1">
              {NAV.map(({ to, label, icon: Icon, end }) => (
                <li key={to}>
                  <NavLink to={to} end={end}
                    className={({ isActive }) => `flex min-h-10 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition-colors ${isActive ? 'bg-surface text-ink shadow-card ring-1 ring-line' : 'text-muted hover:text-ink'}`}>
                    <Icon className="size-4" aria-hidden />{label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="mx-auto max-w-5xl px-4 pb-28 pt-6 outline-none sm:px-6 sm:pb-12 sm:pt-10">
        {loading ? <Spinner /> : error ? (
          <div className="space-y-4">
            <Alert>{error}</Alert>
            <Button variant="secondary" onClick={() => void reload()}>Try again</Button>
          </div>
        ) : <Outlet />}
      </main>

      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:hidden">
        <ul className="grid grid-cols-4">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink to={to} end={end}
                className={({ isActive }) => `flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-semibold ${isActive ? 'text-accent' : 'text-muted'}`}>
                {({ isActive }) => (<>
                  <span className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${isActive ? 'bg-accent-soft' : ''}`}>
                    <Icon className="size-5" aria-hidden />
                  </span>
                  {label}
                </>)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
