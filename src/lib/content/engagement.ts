/**
 * Engagement analytics integration for content performance and subscriber optimization.
 * Links BI events to content consumption for FRD-018/019 and PRD KPIs.
 */
import { bi } from '@/lib/analytics/bi'

export type EngagementSurface = 'hero' | 'inline' | 'header' | 'modal' | string

export interface ContentEngagementContext {
  postId?: string
  slug?: string
  title?: string
  authorId?: string | undefined
  tags?: string[]
}

export interface TimeOnPageSample {
  ms: number
  ts: number
}

export class EngagementTracker {
  private ctx: ContentEngagementContext
  private start = 0
  private visible = true
  private samples: TimeOnPageSample[] = []
  private lastTick = 0
  private interval?: number

  constructor(ctx: ContentEngagementContext) {
    this.ctx = ctx
  }

  startTracking() {
    if (typeof window === 'undefined') return
    this.start = Date.now()
    this.lastTick = this.start
    const onVisibility = () => {
      if (document.hidden) {
        this.visible = false
        this.sample()
      } else {
        this.visible = true
        this.lastTick = Date.now()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    this.interval = window.setInterval(() => this.sample(), 5000)
    // Page view with content context
    bi.pageView({ path: typeof window !== 'undefined' ? window.location.pathname : this.ctx.slug ?? '/' })
  }

  stopTracking() {
    if (typeof window === 'undefined') return
    this.sample()
    if (this.interval) window.clearInterval(this.interval)
  }

  private sample() {
    if (!this.visible) return
    const now = Date.now()
    const delta = Math.max(0, now - this.lastTick)
    this.lastTick = now
    this.samples.push({ ms: delta, ts: now })
  }

  emitScrollDepth(depthPercent: number) {
    bi.track('scroll_depth', {
      depth: Math.min(100, Math.max(0, Math.round(depthPercent))),
      ...this.ctx,
    })
  }

  emitReadComplete() {
    const total = this.samples.reduce((acc, s) => acc + s.ms, 0)
    bi.track('read_complete', {
      total_ms: total,
      samples: this.samples.length,
      ...this.ctx,
    })
  }

  emitSignupStart(surface: EngagementSurface, variant?: string) {
    const payload: { surface: EngagementSurface; variant?: string } = { surface }
    if (typeof variant !== 'undefined') payload.variant = variant
    bi.signupStart(payload as any)
  }

  emitSignupSubmit(surface: EngagementSurface, hasEmail: boolean, role?: string, variant?: string) {
    const payload: { surface: EngagementSurface; hasEmail: boolean; role?: string; variant?: string } = {
      surface,
      hasEmail,
    }
    if (typeof role !== 'undefined') payload.role = role
    if (typeof variant !== 'undefined') payload.variant = variant
    bi.signupSubmit(payload as any)
  }
}