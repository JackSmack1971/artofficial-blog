# Business Objective Tracking Guide

Purpose
This guide operationalizes tracking for core business objectives defined in [/docs/artofficialintelligence_prd.md](docs/artofficialintelligence_prd.md) and the fitness functions and SLAs in [/docs/architecture-decisions.json](docs/architecture-decisions.json).

Objectives
- Subscribers: 25,000 by Month 12
- Engagement: 35%+ open rate
- Traffic: 100,000 monthly unique visitors
- Performance: p95 page load < 2s, LCP p95 <= 2.0s, CLS <= 0.1, TTI p95 <= 3.0s

KPI Catalogue
1) Subscriber Growth
- Metrics: total_subscribers, daily_net_adds, churn, double_opt_in_rate, conversion_rate
- Sources: Ghost Native Newsletter or ConvertKit; BI events from [/src/lib/analytics/bi.ts](src/lib/analytics/bi.ts)
- Targets: 25k by Month 12; daily target curve derived from compounding 15–25% MoM in first year
- Alerts:
  - Daily net adds < 50 for 7 days
  - Double opt-in confirmation rate < 60%
  - Signup conversion on hero or inline < 2.0%

2) Engagement Quality
- Metrics: open_rate, click_rate, bounce_rate, unsubscribe_rate
- Sources: Newsletter platform analytics; BI aggregation via [/src/lib/content/analytics.ts](src/lib/content/analytics.ts)
- Targets: open_rate ≥ 35%; click_rate ≥ 8%
- Alerts:
  - Rolling avg open_rate over last 2 sends < 32%
  - Hard bounce rate > 1.0%

3) Traffic and Acquisition
- Metrics: monthly_uniques, sessions, organic_share, referral_share, conversion_by_source
- Sources: GA4, Plausible
- Targets: 100k monthly uniques
- Alerts:
  - Month-over-month uniques decline > 15%
  - Conversion_by_source for top channels < 1.2%

4) Core Web Vitals and Performance
- Metrics: FCP p95, LCP p95, CLS p95, TTI/INP p95
- Sources: Lighthouse CI, field data (Web Vitals), Vercel Analytics
- Targets: LCP p95 ≤ 2.0s; CLS p95 ≤ 0.1; Lighthouse ≥ 95
- Alerts:
  - LCP p95 > 2.0s for 24h
  - Lighthouse PR check < 95

Data Sources and Wiring
- GA4: env NEXT_PUBLIC_GA_ID
- Plausible: env NEXT_PUBLIC_PLAUSIBLE_DOMAIN
- BI Layer: events emitted via [/src/lib/analytics/bi.ts](src/lib/analytics/bi.ts) and engagement helpers in [/src/lib/content/engagement.ts](src/lib/content/engagement.ts)
- Dev Metrics (local): [/src/lib/analytics/dev-metrics.ts](src/lib/analytics/dev-metrics.ts)

Event Schema Reference
- page_view: { path, ref, utm_source, utm_medium, utm_campaign }
- signup_start: { surface, variant }
- signup_submit: { surface, variant, hasEmail, role }
- funnel_stage: { stage: view|intent|form_focus|form_submit|double_opt_in_sent|confirmed|welcome_sent, surface, variant, slug, postId }
- subscriber_goal_progress: { current, goal, ratePerDay?, etaDays? }
- engagement_kpi: { openRate?, clickRate?, targetOpenRate?, lcpMs?, cls? }

Dashboards
- Subscriber Growth: daily net adds, cumulative vs. target curve, ETA to 25k
- Engagement Cohorts: open/click by cohort, subject line A/B results
- Acquisition: sessions and conversions by source/landing page
- Performance: CWV trends, Lighthouse over time, API error rate

Targets and Thresholds
- Primary fitness functions per [/docs/architecture-decisions.json](docs/architecture-decisions.json):
  - Lighthouse Performance ≥ 95 per PR
  - Global LCP p95 ≤ 2.0s weekly
  - Newsletter open rate ≥ 35% monthly

Operational Procedures
1) Weekly BI Rollup
- Generate weekly metrics snapshot with: subscribers, open/click, unique visitors, CWV
- Compare against targets and annotate deviations

2) Incident Response (Analytics)
- If open_rate rolling average < 32%:
  - Verify deliverability: SPF/DKIM/DMARC
  - Pause saturation; run subject A/B
  - Segment inactive cohort, run win-back

3) Performance Regression Response
- If LCP p95 > 2.0s for 24h:
  - Audit images and hero blocks
  - Validate ISR and cache-control per ADR-004
  - Run Lighthouse CI and trace slow routes

Governance and Review
- Review cadence: Weekly BI sync; Monthly strategy checkpoint
- Ownership:
  - Editorial: Engagement KPIs and content triggers
  - Engineering: Performance KPIs and site reliability
  - Growth: Acquisition and conversion

Appendix
- Consent and GDPR: double opt-in, export/delete endpoints
- Env vars: see [.env.example](.env.example)