'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Emit BI error event without blocking user
    try {
      if (typeof window !== 'undefined' && (window as any).__bi) {
        (window as any).__bi.track('app_error', {
          message: error?.message?.slice(0, 200),
          digest: (error as any)?.digest,
        })
      }
      // Sentry ready hook if integrated
      // if (window.Sentry) window.Sentry.captureException(error)
    } catch {}
  }, [error])

  return (
    <html>
      <body>
        <main className="min-h-screen py-10">
          <section className="mx-auto max-w-xl text-center">
            <h1 className="text-2xl font-bold">Something went wrong.</h1>
            <p className="mt-2 text-sm text-gray-600">
              We track these incidents to improve reliability. Please try again.
            </p>

            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={() => reset()}
                className="rounded-md bg-black px-4 py-2 text-white hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
              >
                Try again
              </button>
              <a
                href="/"
                className="rounded-md border px-4 py-2 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black"
              >
                Go home
              </a>
            </div>

            {process.env.NODE_ENV !== 'production' && (
              <pre className="mt-6 rounded bg-gray-100 p-4 text-left text-xs text-gray-700 overflow-auto">
                {String(error?.stack || error?.message)}
              </pre>
            )}
          </section>
        </main>
      </body>
    </html>
  )
}