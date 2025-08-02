'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { EngagementTracker } from '@/lib/content/engagement'
import type { GhostPost } from '@/lib/content/ghost'
import { bi } from '@/lib/analytics/bi'

// minimal cn util fallback
function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

interface ArticleLayoutProps {
  post: GhostPost
  className?: string
  signupVariant?: 'A' | 'B'
}

export function ArticleLayout({ post, className, signupVariant = 'A' }: ArticleLayoutProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [showExitIntent, setShowExitIntent] = useState(false)

  const tracker = useMemo(() => {
    return new EngagementTracker({
      postId: post.id,
      slug: post.slug,
      title: post.title,
      ...(post.authors?.[0]?.id ? { authorId: post.authors[0].id } : {}),
      tags: post.tags?.map(t => t.slug) ?? [],
    })
  }, [post.id, post.slug, post.title, post.authors, post.tags])

  useEffect(() => {
    tracker.startTracking()

    const onScroll = () => {
      if (!containerRef.current) return
      const el = containerRef.current
      const total = el.scrollHeight - window.innerHeight
      if (total <= 0) return
      const depth = Math.min(100, Math.round((window.scrollY / total) * 100))
      tracker.emitScrollDepth(depth)
      if (depth >= 90) {
        tracker.emitReadComplete()
      }
    }

    const onMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) {
        setShowExitIntent(true)
        bi.track('exit_intent', { slug: post.slug, postId: post.id })
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('mouseleave', onMouseLeave)

    return () => {
      tracker.stopTracking()
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [tracker, post.id, post.slug])

  return (
    <article ref={containerRef} className={cn('mx-auto max-w-3xl px-4 sm:px-6 lg:px-8', className)}>
      <header className="py-8">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{post.title}</h1>
        {post.authors?.length ? (
          <p className="mt-2 text-sm text-muted-foreground">
            By{' '}
            {post.authors[0] ? (
              <Link href={`/authors/${post.authors[0].slug}`} className="underline underline-offset-2">
                {post.authors[0].name}
              </Link>
            ) : null}
          </p>
        ) : null}
      </header>

      <HeroSignup onStart={() => tracker.emitSignupStart('hero', signupVariant)} onSubmit={(hasEmail, role) => tracker.emitSignupSubmit('hero', hasEmail, role, signupVariant)} />

      <section className="prose prose-neutral dark:prose-invert max-w-none">
        {post.html ? (
          <div dangerouslySetInnerHTML={{ __html: post.html }} />
        ) : (
          <p>{post.excerpt}</p>
        )}
      </section>

      <InlineSignup onStart={() => tracker.emitSignupStart('inline', signupVariant)} onSubmit={(hasEmail, role) => tracker.emitSignupSubmit('inline', hasEmail, role, signupVariant)} />

      <ShareBar slug={post.slug} title={post.title} />

      {post.primary_tag ? <Related byTag={post.primary_tag.slug} currentSlug={post.slug} /> : null}

      {showExitIntent ? (
        <ExitIntent onClose={() => setShowExitIntent(false)} onStart={() => tracker.emitSignupStart('modal', signupVariant)} onSubmit={(hasEmail, role) => tracker.emitSignupSubmit('modal', hasEmail, role, signupVariant)} />
      ) : null}
    </article>
  )
}

/* --- Signup Components (lightweight, business-optimized placement) --- */

function HeroSignup(props: { onStart: () => void; onSubmit: (hasEmail: boolean, role?: string) => void }) {
  return (
    <div className="mt-6 rounded-lg border bg-card p-6 shadow-sm">
      <p className="text-base font-medium">Join 25,000+ AI professionals</p>
      <p className="mt-1 text-sm text-muted-foreground">Actionable, credible AI insights. No hype.</p>
      <form
        className="mt-4 flex flex-col gap-3 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault()
          const fd = new FormData(e.currentTarget as HTMLFormElement)
          const email = String(fd.get('email') || '')
          const role = String(fd.get('role') || '')
          props.onStart()
          props.onSubmit(Boolean(email), role || undefined)
        }}
      >
        <input
          name="email"
          type="email"
          required
          placeholder="you@company.com"
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
        <input
          name="role"
          type="text"
          placeholder="Your role (optional)"
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          Subscribe
        </button>
      </form>
      <p className="mt-2 text-xs text-muted-foreground">GDPR-compliant. Unsubscribe anytime.</p>
    </div>
  )
}

function InlineSignup(props: { onStart: () => void; onSubmit: (hasEmail: boolean, role?: string) => void }) {
  return (
    <div className="my-8 rounded-md border p-4">
      <p className="text-sm font-medium">Enjoying this article? Get weekly insights.</p>
      <form
        className="mt-3 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault()
          const fd = new FormData(e.currentTarget as HTMLFormElement)
          const email = String(fd.get('email') || '')
          const role = String(fd.get('role') || '')
          props.onStart()
          props.onSubmit(Boolean(email), role || undefined)
        }}
      >
        <input name="email" type="email" required placeholder="you@company.com" className="w-full rounded border px-3 py-2 text-sm" />
        <input name="role" type="text" placeholder="Role (optional)" className="w-full rounded border px-3 py-2 text-sm" />
        <button type="submit" className="rounded bg-primary px-3 py-2 text-sm text-primary-foreground">Subscribe</button>
      </form>
    </div>
  )
}

function ExitIntent(props: { onClose: () => void; onStart: () => void; onSubmit: (hasEmail: boolean, role?: string) => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <p className="text-base font-semibold">Before you go…</p>
          <button onClick={props.onClose} aria-label="Close" className="text-sm text-muted-foreground">Close</button>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">Get curated, credible AI insights weekly.</p>
        <form
          className="mt-4 flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget as HTMLFormElement)
            const email = String(fd.get('email') || '')
            const role = String(fd.get('role') || '')
            props.onStart()
            props.onSubmit(Boolean(email), role || undefined)
          }}
        >
          <input name="email" type="email" placeholder="you@company.com" className="w-full rounded border px-3 py-2 text-sm" />
          <input name="role" type="text" placeholder="Your role (optional)" className="w-full rounded border px-3 py-2 text-sm" />
          <button type="submit" className="rounded bg-primary px-3 py-2 text-sm text-primary-foreground">Subscribe</button>
        </form>
      </div>
    </div>
  )
}

/* --- Social share and related content --- */

function ShareBar({ slug, title }: { slug: string; title: string }) {
  const url = typeof window !== 'undefined' ? window.location.origin + '/blog/' + slug : 'https://artofficialintelligence.academy/blog/' + slug
  const tweet = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`
  const li = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
  return (
    <div className="mt-8 flex items-center gap-3 border-t pt-4">
      <span className="text-sm text-muted-foreground">Share:</span>
      <a href={tweet} target="_blank" rel="noopener noreferrer" className="text-sm underline">Twitter</a>
      <a href={li} target="_blank" rel="noopener noreferrer" className="text-sm underline">LinkedIn</a>
    </div>
  )
}

function Related({ byTag, currentSlug }: { byTag: string; currentSlug: string }) {
  const [items, setItems] = useState<{ title: string; slug: string }[]>([])
  useEffect(() => {
    let mounted = true
    // Lazy import to avoid SSR dependency on Ghost at build-time components
    import('@/lib/content/ghost').then(async ({ getRelatedByTag }) => {
      const posts = await getRelatedByTag(byTag, 5)
      if (!mounted) return
      setItems(posts.filter(p => p.slug !== currentSlug).slice(0, 3).map(p => ({ title: p.title, slug: p.slug })))
    })
    return () => {
      mounted = false
    }
  }, [byTag, currentSlug])

  if (!items.length) return null
  return (
    <aside className="mt-8">
      <p className="mb-3 text-sm font-semibold">Related articles</p>
      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it.slug}>
            <Link href={`/blog/${it.slug}`} className="text-sm underline underline-offset-2">{it.title}</Link>
          </li>
        ))}
      </ul>
    </aside>
  )
}