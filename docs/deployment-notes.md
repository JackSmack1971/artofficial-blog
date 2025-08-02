# Deployment Notes

Purpose
Document the deployment context, risks, validations, and artifacts for this release. Attach this file to the PR as required.

Release Summary
- Feature/Change: <enter summary>
- Affected Areas: <pages, APIs, services>
- Migration Steps: <DB, config, env vars>
- Rollout Plan: <canary %, schedule>

Pre-Deployment Checklist (Injected from docs/success-measurement-and-growth-protocols.md)
- Success and ownership: docs/success-measurement-and-growth-protocols.md
- Business objectives: docs/business-objective-tracking.md
- Architecture fitness: docs/architecture-decisions.json (Newsletter open rate ≥ 35%; performance gates)

Please ensure the following validations are completed before merge:
- [ ] KPI gate: engagement_kpi meets target (open rate ≥ 35%)
- [ ] Lighthouse CI: Performance ≥ ADR threshold (default 95) under mobile throttling
- [ ] No PII exposure or tracking policy violations
- [ ] Accessibility baseline maintained (WCAG 2.1 AA)
- [ ] Error budget unaffected; no critical Sentry regressions

Deployment Steps
1) Build and Artifacts
- Command(s): npm ci && npm run build
- Artifact(s): <list output>

2) Environment
- Env Changes: <list new/changed vars>
- Feature Flags: <list>

3) Data / Migrations
- Migration Plan: <describe>
- Rollback Plan: <describe>

Validation Evidence
- KPI Artifact: artifacts/kpis/latest.json
- Lighthouse Report: artifacts/lhci/<report>.report.json
- E2E Test Summary: <attach or link>

Risk Assessment
- Risk Level: Low / Medium / High
- Primary Risks: <describe>
- Mitigations: <describe>

Post-Deployment Monitoring
- Metrics to Watch: LCP p95, CLS, 5xx rates, newsletter signups/open rate
- Dashboards/Links: <links>
- Owner(s): <name(s)>

Rollback Strategy
- Trigger Conditions: <describe>
- Procedure: <describe>

Sign-offs
- Engineering: <name/date>
- Product: <name/date>
- QA: <name/date>

Notes
This template references the success measurement and growth protocols and architecture decision thresholds to ensure alignment with business objectives.