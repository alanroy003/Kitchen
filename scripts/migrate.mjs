// Applies every SQL file in supabase/migrations (in name order) to DATABASE_URL.
// Each file must be idempotent so re-running is safe.
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import pg from 'pg'

const env = Object.fromEntries(
  readFileSync('.env', 'utf8').split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)
const url = process.env.DATABASE_URL || env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL missing in .env')

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
await client.connect()
const dir = 'supabase/migrations'
for (const f of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
  process.stdout.write(`Applying ${f} ... `)
  await client.query(readFileSync(join(dir, f), 'utf8'))
  console.log('ok')
}
await client.end()
