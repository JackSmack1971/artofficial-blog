/**
 * Business Intelligence Event Bus (TypeScript facade)
 * Mirrors the lightweight runtime set on window.__bi by app/layout.tsx
 * Provides typed helpers for emitting core business events.
 *
 * Phase 2+: Dual analytics (GA4 + Plausible) with business KPI helpers and subscriber growth analytics.
 * Aligns with FRD-018/019/020 objectives.
 */

export type BIEventType =
  | 'page_view'
  | 'signup_start'
  | 'signup_submit'
  | 'ab_variant'
  | 'perf_vitals'
  | 'funnel_stage'
  | 'attribution_touch'
  | 'subscriber_goal_progress'
  | 'engagement_kpi';

export interface PageViewPayload {
  path: string;
  ref?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

export interface SignupStartPayload {
  surface: 'hero' | 'inline' | 'header' | 'modal' | string;
  variant?: 'A' | 'B' | string;
}

export interface SignupSubmitPayload extends SignupStartPayload {
  hasEmail?: boolean;
  role?: string;
}

export interface ABVariantPayload {
  test: string;
  variant: string;
}

export interface PerfVitalsPayload {
  name: 'LCP' | 'CLS' | string;
  value: number;
}

export interface FunnelStagePayload {
  stage:
    | 'view'
    | 'intent'
    | 'form_focus'
    | 'form_submit'
    | 'double_opt_in_sent'
    | 'confirmed'
    | 'welcome_sent';
  surface?: string;
  variant?: string;
  slug?: string;
  postId?: string;
}

export interface AttributionTouchPayload {
  source: string;
  medium?: string;
  campaign?: string;
  referrer?: string;
  path?: string;
}

export interface SubscriberGoalProgressPayload {
  current: number;
  goal: number;
  // exactOptionalPropertyTypes-safe optionals
  ratePerDay?: number | undefined;
  etaDays?: number | undefined;
}

export interface EngagementKpiPayload {
  openRate?: number;
  clickRate?: number;
  targetOpenRate?: number;
  lcpMs?: number;
  cls?: number;
}

type Payload =
  | PageViewPayload
  | SignupStartPayload
  | SignupSubmitPayload
  | ABVariantPayload
  | PerfVitalsPayload
  | FunnelStagePayload
  | AttributionTouchPayload
  | SubscriberGoalProgressPayload
  | EngagementKpiPayload
  | Record<string, unknown>;

declare global {
  interface Window {
    __bi?: {
      track: (type: BIEventType | string, payload?: Record<string, unknown>) => void;
      on: (fn: (e: { type: string; payload?: unknown; ts: number }) => void) => () => void;
    };
    plausible?: (event: string, options?: { props?: Record<string, unknown> }) => void;
    gtag?: (...args: any[]) => void;
  }
}

function emit<T extends Payload>(type: BIEventType | string, payload?: T) {
  if (typeof window === 'undefined') return;
  if (window.__bi?.track) {
    window.__bi.track(type, payload as Record<string, unknown>);
  } else {
    // minimal no-op queue fallback to avoid errors before hydration
    (window as any).__bi = (window as any).__bi || {
      q: [] as Array<{ type: string; payload?: unknown; ts: number }>,
      on: () => () => {},
      emit: () => {},
      track: (t: string, p?: Record<string, unknown>) => {
        (window as any).__bi.q.push({ type: t, payload: p ?? {}, ts: Date.now() });
      },
    };
    (window as any).__bi.track(type, payload as Record<string, unknown>);
  }
}

/**
 * Business KPI helpers
 * - Goal progress emitter
 * - Engagement KPI emitter
 */
function calcGoalETA(current: number, goal: number, ratePerDay?: number) {
  if (!ratePerDay || ratePerDay <= 0)
    return { ratePerDay: undefined as number | undefined, etaDays: undefined as number | undefined };
  const remaining = Math.max(goal - current, 0);
  const etaDays = remaining / ratePerDay;
  return { ratePerDay, etaDays: +etaDays.toFixed(2) };
}

export const bi = {
  pageView: (payload: PageViewPayload) => emit('page_view', payload),
  signupStart: (payload: SignupStartPayload) => emit('signup_start', payload),
  signupSubmit: (payload: SignupSubmitPayload) => emit('signup_submit', payload),
  abVariant: (payload: ABVariantPayload) => emit('ab_variant', payload),
  perfVitals: (payload: PerfVitalsPayload) => emit('perf_vitals', payload),
  funnelStage: (payload: FunnelStagePayload) => emit('funnel_stage', payload),
  attributionTouch: (payload: AttributionTouchPayload) => emit('attribution_touch', payload),

  subscriberGoalProgress: (current: number, goal: number, ratePerDay?: number) => {
    const { etaDays } = calcGoalETA(current, goal, ratePerDay);
    const payload: SubscriberGoalProgressPayload = {
      current,
      goal,
      ratePerDay: typeof ratePerDay === 'number' ? ratePerDay : undefined,
      etaDays: typeof etaDays === 'number' ? etaDays : undefined,
    };
    emit<SubscriberGoalProgressPayload>('subscriber_goal_progress', payload);
  },

  engagementKPI: (payload: EngagementKpiPayload) => emit('engagement_kpi', payload),

  track: emit,
};