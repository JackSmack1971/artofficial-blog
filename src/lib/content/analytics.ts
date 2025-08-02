/**
 * Content performance analytics and subscriber correlation layer
 * - Correlates engagement signals with signup conversions
 * - Produces BI-friendly aggregates for strategy insights
 *
 * Aligns with FRD-018/019 and PRD KPI tracking.
 */
import { mean, median, standardDeviation, sampleCorrelation } from 'simple-statistics'

export type EngagementSignal = {
  postId: string
  slug: string
  ts: number
  timeOnPageMs?: number
  scrollDepth?: number // 0-100
  readComplete?: boolean
  variant?: string
  surface?: string
}

export type ConversionEvent = {
  postId?: string
  slug?: string
  ts: number
  surface: string
  variant?: string
}

export type ContentAggregate = {
  postId: string
  slug: string
  views: number
  avgTimeOnPageMs: number
  medTimeOnPageMs: number
  sdTimeOnPageMs: number
  readCompletionRate: number // 0..1
  avgScrollDepth: number // 0..100
  conversions: number
  conversionRate: number // conversions / views
}

export type CorrelationInsights = {
  slug: string
  timeOnPage_to_conversion_corr: number | undefined
  scrollDepth_to_conversion_corr: number | undefined
  readComplete_to_conversion_corr: number | undefined
  variantLift: Record<string, number> // variant => conversion rate delta vs global
}

export class ContentAnalyticsEngine {
  private engagements: EngagementSignal[] = []
  private conversions: ConversionEvent[] = []

  addEngagement(e: EngagementSignal) {
    this.engagements.push(e)
  }

  addConversion(c: ConversionEvent) {
    this.conversions.push(c)
  }

  aggregateBySlug(): ContentAggregate[] {
    const bySlug = new Map<string, { e: EngagementSignal[]; c: ConversionEvent[] }>()
    for (const e of this.engagements) {
      const key = e.slug
      if (!key) continue
      const entry = bySlug.get(key) ?? { e: [], c: [] }
      entry.e.push(e)
      bySlug.set(key, entry)
    }
    for (const c of this.conversions) {
      const key = c.slug
      if (!key) continue
      const entry = bySlug.get(key) ?? { e: [], c: [] }
      entry.c.push(c)
      bySlug.set(key, entry)
    }

    const out: ContentAggregate[] = []
    for (const [slug, { e, c }] of bySlug.entries()) {
      const views = e.length
      const times = e.map(x => x.timeOnPageMs ?? 0)
      const scrolls = e.map(x => (typeof x.scrollDepth === 'number' ? x.scrollDepth : 0))
      const reads = e.map(x => (x.readComplete ? 1 : 0))
      const conversions = c.length

      const avgTime = times.length ? mean(times) : 0
      const medTime = times.length ? median(times) : 0
      const sdTime = times.length > 1 ? standardDeviation(times) : 0
      const readRate = reads.length ? mean(reads) : 0
      const avgScroll = scrolls.length ? mean(scrolls) : 0
      const convRate = views > 0 ? conversions / views : 0

      const postId = e.find(x => x.postId)?.postId ?? ''

      out.push({
        postId,
        slug,
        views,
        avgTimeOnPageMs: Math.round(avgTime),
        medTimeOnPageMs: Math.round(medTime),
        sdTimeOnPageMs: Math.round(sdTime),
        readCompletionRate: +(readRate.toFixed(4)),
        avgScrollDepth: +(avgScroll.toFixed(2)),
        conversions,
        conversionRate: +(convRate.toFixed(4)),
      })
    }
    return out
  }

  correlationBySlug(): CorrelationInsights[] {
    // For simple offline correlation, we map engagements to a binary vector of conversions within a time window
    // The assumption: if a conversion occurs within 30 minutes after an engagement for same slug, count as 1
    const windowMs = 30 * 60 * 1000

    const bySlugEng = new Map<string, EngagementSignal[]>()
    const bySlugConv = new Map<string, number[]>() // list of conversion timestamps

    for (const e of this.engagements) {
      const arr = bySlugEng.get(e.slug) ?? []
      arr.push(e)
      bySlugEng.set(e.slug, arr)
    }
    for (const c of this.conversions) {
      const arr = bySlugConv.get(c.slug ?? '') ?? []
      arr.push(c.ts)
      bySlugConv.set(c.slug ?? '', arr)
    }

    const results: CorrelationInsights[] = []
    for (const [slug, eng] of bySlugEng.entries()) {
      const convTs = (bySlugConv.get(slug) ?? []).sort((a, b) => a - b)
      if (!eng.length) continue

      const toBinary = (ts: number) => {
        // Any conversion within window after ts?
        const cutoff = ts + windowMs
        // Binary search could be used; linear scan acceptable for small data
        return convTs.some(t => t >= ts && t <= cutoff) ? 1 : 0
      }

      const y = eng.map(e => toBinary(e.ts))
      const timeVec = eng.map(e => e.timeOnPageMs ?? 0)
      const depthVec = eng.map(e => (typeof e.scrollDepth === 'number' ? e.scrollDepth : 0))
      const readVec = eng.map(e => (e.readComplete ? 1 : 0))

      const corr = (x: number[]) => {
        try {
          if (x.length < 2 || y.length < 2) return undefined
          const c = sampleCorrelation(x, y)
          if (Number.isNaN(c)) return undefined
          return +c.toFixed(4)
        } catch {
          return undefined
        }
      }

      // Variant lift: compare conversion rates per variant vs overall
      const overall = y.length ? mean(y) : 0
      const byVariant = new Map<string, number[]>()
      eng.forEach((e, i) => {
        const key = e.variant ?? 'default'
        const arr = byVariant.get(key) ?? []
        arr.push(y[i] ?? 0)
        byVariant.set(key, arr)
      })
      const variantLift: Record<string, number> = {}
      for (const [v, arr] of byVariant.entries()) {
        const rate = arr.length ? mean(arr) : 0
        variantLift[v] = +(rate - overall).toFixed(4)
      }

      results.push({
        slug,
        timeOnPage_to_conversion_corr: corr(timeVec),
        scrollDepth_to_conversion_corr: corr(depthVec),
        readComplete_to_conversion_corr: corr(readVec),
        variantLift,
      })
    }
    return results
  }
}