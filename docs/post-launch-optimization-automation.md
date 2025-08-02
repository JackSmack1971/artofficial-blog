# Post-Launch Optimization Automation Guide

Purpose
Enable autonomous optimization loops that protect and accelerate achievement of business objectives: 25k subscribers, 35%+ open rate, 100k monthly visitors, and CWV performance compliance.

References
- PRD: [/docs/artofficialintelligence_prd.md](docs/artofficialintelligence_prd.md)
- FRD: [/docs/artofficialintelligence_frd.md](docs/artofficialintelligence_frd.md)
- ADRs: [/docs/architecture-decisions.json](docs/architecture-decisions.json)
- Launch Validation: [/docs/launch-readiness-business-validation.json](docs/launch-readiness-business-validation.json)

Core Automation Pillars
1) Monitoring: continuous collection of KPIs via GA4, Plausible, BI events, Lighthouse CI
2) Detection: rules that detect regressions or opportunities
3) Action: automated remediation playbooks or human-in-the-loop workflows
4) Verification: post-action validation to confirm improvement
5) Governance: audit trails and ownership

Event and Metric Sources
- BI Runtime: [/src/lib/analytics/bi.ts](src/lib/analytics/bi.ts)
- Engagement Hooks: [/src/lib/content/engagement.ts](src/lib/content/engagement.ts)
- Content Analytics Aggregation: [/src/lib/content/analytics.ts](src/lib/content/analytics.ts)
- Dev Metrics (local/testing): [/src/lib/analytics/dev-metrics.ts](src/lib/analytics/dev-metrics.ts)
- Lighthouse CI: [/lighthouserc.json](lighthouserc.json)

Automation Triggers and Actions
A. Open Rate Protection (Engagement)
- Trigger: rolling_avg_open_rate over last 2 sends < 32%
- Actions:
  1) Deliverability audit: verify SPF/DKIM/DMARC alignment
  2) Switch to subject line A/B for next two sends (2 variants)
  3) Cohort send-time experiment for top 2 cohorts
  4) Start win-back for inactive subscribers (90d+)
- Verification:
  - Open rate returns ≥ 35% within two sends
  - If not, escalate to manual review and sender domain warm-up

B. Signup Conversion Guardrail (Acquisition)
- Trigger: signup conversion on primary landing pages < 2.0% over last 7 days
- Actions:
  1) Launch landing page A/B test (headline, CTA, proof block)
  2) Enable exit-intent modal on affected pages
  3) Increase inline form prominence in top-performing articles
- Verification:
  - Conversion ≥ 2.0% in 14 days, else iterate on variant winners

C. Performance Regression Watch (CWV)
- Trigger: LCP p95 > 2.0s for 24h or Lighthouse PR score < 95
- Actions:
  1) Automated Lighthouse run; attach report to CI
  2) Image policy audit: compress/resize, serve WebP/AVIF
  3) Validate ISR and cache-control per ADR-004
  4) Defer non-critical JS via dynamic import
- Verification:
  - Lighthouse ≥ 95 and LCP p95 ≤ 2.0s restored

D. Subscriber Growth Trajectory (North Star)
- Trigger: 7-day moving average net adds < target curve for 2 consecutive weeks
- Actions:
  1) Publish cadence micro-boost: 1 extra feature or guide/week
  2) Partner promotion slot and cross-posting activation
  3) Introduce lead magnet CTA in top 10 organic posts
- Verification:
  - Net adds back on curve within 2 weeks

Data Engineering and BI Jobs
- Daily ETL: consolidate subscriber counts, open/click events, conversion by source, CWV metrics
- Weekly Rollup: snapshot KPI panel and annotate anomalies
- Storage: append-only metrics logs with timestamps and source tags
- Integrity: basic outlier detection and de-duplication rules

Automation Implementation Patterns
- CI Hooks:
  - Pre-merge Lighthouse run gates PR if score < 95
  - Optional: script to evaluate CWV regression budgets
- Scheduled Jobs:
  - Daily: subscriber and conversion sync; trigger goal progress event via bi.subscriberGoalProgress
  - Weekly: open/click cohort analysis; trigger engagement_kpi events
- Webhooks:
  - Newsletter provider webhooks for send/completion; transform into BI events
- Feature Flags:
  - A/B toggles for subject lines, landing variants, exit-intent enablement

Ownership and Escalation
- Editorial Lead: Open rate, content experiments, win-back
- Growth Lead: Landing tests, acquisition mix, partner promos
- Engineering Lead: Performance regressions, caching, image pipeline
- Escalation Matrix:
  - Priority P1: CWV or deliverability failure (fix within 24–48h)
  - Priority P2: Conversion dip (fix within 7–14d)
  - Priority P3: Growth trajectory deviation (fix within 14–21d)

Audit and Compliance
- Retain change logs for triggers and actions (timestamp, actor, context)
- GDPR: ensure no PII is stored in logs beyond lawful basis; use pseudonymous IDs
- Security headers and TLS per ADRs

Runbooks (Quick Actions)
- Re-enable A/B on newsletter subject lines for next 2 sends
- Activate exit-intent modal on / and /blog routes for 14 days
- Regenerate hero images with modern formats and sizes
- Purge CDN cache for updated hero routes and run Lighthouse

Success Criteria for Automation
- Mean time to detect (MTTD) anomalies < 24h
- Mean time to remediate (MTTR) P1 issues < 48h
- Open rate maintained ≥ 35% over rolling 30 days
- LCP p95 ≤ 2.0s over rolling 7 days