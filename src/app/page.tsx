'use client'

/**
 * Conversion-optimized landing with A/B scaffolding and analytics events.
 * Lightweight, no external JS libs. Uses the BI bus from layout (__bi).
 */

function track(type: string, payload?: Record<string, unknown>) {
  // fanout handled by __bi in layout
  if (typeof window !== 'undefined' && (window as any).__bi) {
    (window as any).__bi.track(type, payload || {});
  }
}

function pickVariant(): 'A' | 'B' {
  // simple, deterministic stickiness using localStorage
  if (typeof window === 'undefined') return 'A';
  const key = '__ab_home_hero';
  let val = window.localStorage.getItem(key);
  if (val !== 'A' && val !== 'B') {
    val = Math.random() < 0.5 ? 'A' : 'B';
    window.localStorage.setItem(key, val);
  }
  return val as 'A' | 'B';
}

export default function HomePage() {
  const variant = pickVariant();

  function onSignupStart() {
    track('signup_start', { surface: 'hero', variant });
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get('email') || '').trim();
    track('signup_submit', { surface: 'hero', variant, hasEmail: email.length > 0 });
    // TODO: hook to /api/newsletter (Ghost/ConvertKit). For now, just reset.
    e.currentTarget.reset();
  }

  return (
    <main className="py-10">
      <section className="mx-auto max-w-3xl text-center">
        <span className="inline-block rounded-full bg-black text-white px-3 py-1 text-xs tracking-wide">
          Performance-First Authority
        </span>
        <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
          Cut through AI noise with curated, credible, actionable insight
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          Built for professionals who need signal, not noise. Join the newsletter to stay ahead with practical,
          business-ready analysis.
        </p>

        {/* A/B: variant A uses single-field, variant B adds optional role select */}
        <div className="mt-8">
          <form
            aria-label="Newsletter signup"
            onSubmit={onSubmit}
            className="mx-auto flex w-full max-w-xl flex-col gap-3 sm:flex-row"
          >
            <input
              type="email"
              name="email"
              inputMode="email"
              required
              onFocus={onSignupStart}
              placeholder="Enter your email"
              className="w-full rounded-md border border-gray-300 px-4 py-3 shadow-sm focus:border-black focus:outline-none"
              aria-label="Email address"
            />
            {variant === 'B' && (
              <select
                name="role"
                className="w-full rounded-md border border-gray-300 px-4 py-3 shadow-sm focus:border-black focus:outline-none sm:max-w-[11rem]"
                defaultValue=""
                aria-label="Your role (optional)"
              >
                <option value="" disabled>
                  Role (optional)
                </option>
                <option>AI Practitioner</option>
                <option>Tech Strategist</option>
                <option>Curious Professional</option>
              </select>
            )}
            <button
              type="submit"
              className="rounded-md bg-black px-5 py-3 font-semibold text-white hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
              aria-label="Subscribe to newsletter"
            >
              Subscribe
            </button>
          </form>
          <p className="mt-2 text-xs text-gray-500">GDPR-friendly. No spam. Unsubscribe anytime.</p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border p-4 text-left">
            <p className="text-sm font-semibold">Performance</p>
            <p className="mt-1 text-sm text-gray-600">
              {'<2s'} global loads with edge caching, optimized assets.
            </p>
          </div>
          <div className="rounded-lg border p-4 text-left">
            <p className="text-sm font-semibold">Authority</p>
            <p className="mt-1 text-sm text-gray-600">Academic rigor, practical takeaways, credible sources.</p>
          </div>
          <div className="rounded-lg border p-4 text-left">
            <p className="text-sm font-semibold">Growth</p>
            <p className="mt-1 text-sm text-gray-600">Engineered for 25k subscribers with conversion analytics.</p>
          </div>
        </div>
      </section>
    </main>
  )
}