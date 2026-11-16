/** Shown instead of the app when required build-time env vars are missing. */
export function ConfigError({ missing }: { missing: string[] }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-4 py-12 text-ink">
      <h1 className="text-xl font-semibold">Setup needed</h1>
      <p className="text-sm text-muted">
        This build is missing its Supabase settings, so the app can’t start. Add these environment
        variables, then rebuild:
      </p>
      <ul className="rounded-lg border border-line bg-surface p-3 font-mono text-sm">
        {missing.map((name) => <li key={name}>{name}</li>)}
      </ul>
      <p className="text-sm text-muted">
        Locally, put them in <code className="font-mono">.env</code>. On Vercel, add them under
        Project Settings → Environment Variables and redeploy — they’re read at build time.
      </p>
    </main>
  )
}
