// Lightweight development metrics scaffold aligned with ADRs
// Reads DEV_TELEMETRY_ENABLED and DEV_METRICS_LOG_LEVEL from env
// Provides a minimal API for logging business and performance events during development

type Level = 'debug' | 'info' | 'warn' | 'error'

interface MetricEvent {
  name: string
  category: 'business' | 'performance' | 'diagnostic'
  props?: Record<string, unknown>
  ts?: number
}

const enabled = process.env.DEV_TELEMETRY_ENABLED === '1' || process.env.NODE_ENV === 'development'
const level = (process.env.DEV_METRICS_LOG_LEVEL as Level) || 'info'

const levelPriority: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
}

function shouldLog(l: Level) {
  return enabled && levelPriority[l] >= levelPriority[level]
}

function log(l: Level, ev: MetricEvent) {
  if (!shouldLog(l)) return
  const payload = { ...ev, ts: ev.ts ?? Date.now() }
  // eslint-disable-next-line no-console
  console[l === 'debug' ? 'log' : l](`[dev-metrics] ${ev.category}:${ev.name}`, payload)
}

export const DevMetrics = {
  business(name: string, props?: Record<string, unknown>, l: Level = 'info') {
    log(l, { name, category: 'business', props })
  },
  performance(name: string, props?: Record<string, unknown>, l: Level = 'info') {
    log(l, { name, category: 'performance', props })
  },
  diagnostic(name: string, props?: Record<string, unknown>, l: Level = 'debug') {
    log(l, { name, category: 'diagnostic', props })
  }
}

// Example usage (do not execute automatically in prod):
// DevMetrics.business('newsletter_signup_attempt', { source: 'footer_form' })
// DevMetrics.performance('lcp_measure', { ms: 1200 })