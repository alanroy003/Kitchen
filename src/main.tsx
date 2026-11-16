import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConfigError } from './components/ConfigError'
import './index.css'

const root = createRoot(document.getElementById('root')!)

// Check before loading the app: src/lib/supabase.ts throws on import without these,
// which would otherwise leave a blank page.
const missing = [
  !import.meta.env.VITE_SUPABASE_URL && 'VITE_SUPABASE_URL',
  !import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY && 'VITE_SUPABASE_PUBLISHABLE_KEY',
].filter((name): name is string => Boolean(name))

if (missing.length) {
  root.render(<ConfigError missing={missing} />)
} else {
  import('./Root').then(({ Root }) =>
    root.render(
      <StrictMode>
        <Root />
      </StrictMode>,
    ),
  )
}
