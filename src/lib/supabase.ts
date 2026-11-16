import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

if (!url || !key) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env')
}

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})

/** Turns Supabase errors into short, human messages. */
export function friendlyError(e: unknown): string {
  const msg = (e as { message?: string })?.message ?? String(e)
  if (/invalid login credentials/i.test(msg)) return 'Email or password is incorrect.'
  if (/email not confirmed/i.test(msg)) return 'Please confirm your email first — check your inbox.'
  if (/user already registered/i.test(msg)) return 'An account with this email already exists. Try signing in.'
  if (/rate limit/i.test(msg)) return 'Too many attempts. Please wait a minute and try again.'
  if (/failed to fetch|network/i.test(msg)) return 'Can’t reach the server. Check your connection.'
  return msg
}
