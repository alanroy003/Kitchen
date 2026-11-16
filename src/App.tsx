import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
import { Layout } from './components/Layout'
import { Spinner } from './components/ui'
import { Login, Signup, ForgotPassword, ResetPassword } from './pages/Auth'
import { Dashboard } from './pages/Dashboard'
import { CalendarPage } from './pages/Calendar'
import { PaymentsPage } from './pages/Payments'
import { SettingsPage } from './pages/Settings'

// Dev-only UI preview with sample data; tree-shaken out of production builds.
const DevPreview = import.meta.env.DEV ? lazy(() => import('./dev/Preview')) : null

const TITLES: Record<string, string> = {
  '/': 'Today', '/calendar': 'Calendar', '/payments': 'Payments', '/settings': 'Settings',
  '/login': 'Sign in', '/signup': 'Create account', '/forgot-password': 'Reset password', '/reset-password': 'New password',
}

export function App() {
  const { session, loading, recovering } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const page = TITLES[location.pathname]
    document.title = page ? `${page} · Lissy Kitchen` : 'Lissy Kitchen'
    // Move focus to main content on route change for screen-reader users.
    document.getElementById('main')?.focus({ preventScroll: true })
  }, [location.pathname])

  useEffect(() => {
    if (recovering && location.pathname !== '/reset-password') navigate('/reset-password')
  }, [recovering, location.pathname, navigate])

  if (loading) return <Spinner />

  if (DevPreview && location.pathname === '/dev') {
    return <Suspense fallback={<Spinner />}><DevPreview /></Suspense>
  }

  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="*" element={<Navigate to="/login" replace state={{ from: location.pathname }} />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/signup" element={<Navigate to="/" replace />} />
      <Route element={<DataProvider><Layout /></DataProvider>}>
        <Route index element={<Dashboard />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
