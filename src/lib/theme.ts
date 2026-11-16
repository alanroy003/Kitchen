import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark' | 'system'

function read(): Theme {
  try {
    const t = localStorage.getItem('theme')
    return t === 'light' || t === 'dark' ? t : 'system'
  } catch { return 'system' }
}

function apply(t: Theme) {
  const dark = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(read)
  useEffect(() => {
    apply(theme)
    try { theme === 'system' ? localStorage.removeItem('theme') : localStorage.setItem('theme', theme) } catch { /* ignore */ }
    if (theme !== 'system') return
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const on = () => apply('system')
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [theme])
  return [theme, setTheme] as const
}
