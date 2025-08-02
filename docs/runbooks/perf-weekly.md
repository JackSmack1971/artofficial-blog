# Weekly Performance Guardrail Runbook — LCP p95 ≤ 2.0s

Purpose
This runbook documents the scheduled quality gate that validates Core Web Vitals performance weekly. It enforces the ADR fitness function: Global LCP p95 ≤ 2.0s (docs/architecture-decisions.json) and provides operational steps, evidence retention, and remediation.

Schedule and Triggers
- Schedule: Every Monday 13:00 UTC (09:00 ET)
- Manual: On demand via GitHub Actions “Run workflow”
- Workflow: .github/workflows/perf-weekly.yml

Data Sources and Method
- PSI Field Data (CrUX): Desktop and Mobile requests to PageSpeed Insights (unauthenticated). Records LCP p75 as directional indicator.
- LHCI Lab Backup: Lighthouse run against local build to compute lab LCP and enforce the 2.0s threshold as a proxy guardrail if the field metric is unavailable or regressed.

Thresholds and Enforcement
- Target: LCP p95 ≤ 2.0 seconds
- Enforcement:
  - Primary signal: LHCI lab LCP must be ≤ 2000 ms (threshold resolved from docs/architecture-decisions.json; fallback 2.0s)
  - PSI field results are summarized for context (p75) and trend monitoring
- Failure condition: Lab LCP > 2000 ms returns non-zero exit code, failing the job

Artifacts and Retention
- Artifacts uploaded for 14 days:
  - weekly-perf-artifacts: PSI desktop/mobile JSON responses, psi_summary.md, LHCI report(s)
  - weekly-perf-summary: run_summary.md
- PSI files:
  - artifacts/psi_desktop.json
  - artifacts/psi_mobile.json
  - artifacts/psi_summary.md
- LHCI files:
  - artifacts/lhci/*.report.json

How to Read Reports
1) PSI Summary (psi_summary.md)
   - Desktop LCP p75 (ms) and category
   - Mobile  LCP p75 (ms) and category
   Note: p75 is not p95; use for directional checks only.

2) Lighthouse Lab Report (*.report.json)
   - audits.largest-contentful-paint.numericValue = LCP in ms
   - categories.performance.score (should remain ≥ 0.95 per PR via existing CI)

Operational Procedures

Normal Green Run
- Verify psi_summary.md shows “GOOD/NEEDS_IMPROVEMENT” categories with reasonable p75 values
- Confirm LH lab LCP ≤ 2000 ms in run_summary.md
- No action required

Failure or Regression
If LHCI lab LCP > 2000 ms:
1) Validate baseline:
   - Confirm there was no infrastructure anomaly (CI runner load, caching misses)
   - Re-run workflow manually to eliminate transient noise

2) Investigate likely causes:
   - Recent UI changes impacting above-the-fold content (hero, images, fonts)
   - Third-party scripts or analytics regressions
   - Cache-control, ISR, or image optimization misconfigurations (see ADR-004)

3) Mitigation steps:
   - Audit images and hero blocks for size, format (WebP/AVIF), and lazy loading
   - Ensure font-display: swap and limit blocking resources
   - Validate ISR (s-maxage=300, stale-while-revalidate=86400), static assets immutable, API cache headers
   - Defer non-critical scripts; use async/defer and code-split heavy components
   - Re-run LHCI locally and in CI to confirm improvements

4) Incident communication:
   - Open a “Performance Regression” issue with:
     - Links to failing run artifacts
     - Suspected cause, scope, proposed fix
   - Tag Engineering owner per docs/success-measurement-and-growth-protocols.md

Manual Execution
- Navigate to Actions → Weekly Performance - LCP p95 Guardrail → Run workflow
- After completion, download weekly-perf-artifacts and weekly-perf-summary

Dependencies and Configuration
- No PSI API key required (unauthenticated fetch)
- Node 20, @lhci/cli latest
- Uses lighthouserc.json for LH defaults
- Threshold resolved from docs/architecture-decisions.json (Global LCP p95, threshold_seconds)

Alignment with Business Objectives
- Business tracking: docs/business-objective-tracking.md → Performance: “LCP p95 ≤ 2.0s; Lighthouse ≥ 95”
- Architectural fitness function: docs/architecture-decisions.json → “Global LCP p95 ≤ 2.0s weekly”
- CI PR gate for Lighthouse ≥95: .github/workflows/ci.yml + lighthouserc.json

Owner and Review Cadence
- Owner: Engineering (Performance & Reliability)
- Review weekly, and during post-incident analysis if any breach occurs

Change Log
- 2025-08-02: Initial runbook and scheduler implemented with 14-day artifact retention