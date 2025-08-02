# ARTOfficial Intelligence Academy — Integration Points

This document enumerates and specifies all interfaces between the application and external/internal systems. Each interface includes purpose, protocol, auth, rate limits, error handling, and observability guidance.

## Index
1. Ghost Pro Content API (INT-001)
2. Ghost Admin API (INT-002)
3. Ghost Webhooks for ISR Revalidation (INT-003)
4. Newsletter Service Abstraction (INT-004) — Ghost Native primary, ConvertKit fallback
5. Analytics Integrations (INT-005) — GA4 + Plausible
6. Social Sharing and Promotion (INT-006) — Twitter/X, LinkedIn, Meta
7. Sitemap/SEO Interfaces (INT-007)
8. Error Handling and Observability (INT-008)
9. Rate Limiting and Abuse Protection (INT-009)
10. Security and Compliance Controls (INT-010)

---

## INT-001 Ghost Pro Content API
- Purpose: Fetch posts, authors, tags, and metadata for public rendering.
- Protocol: HTTPS REST, version v5.
- Auth: Content API Key in querystring.
- Key Endpoints:
  - GET /ghost/api/v5/content/posts/?key={key}&limit={n}&include=tags,authors
  - GET /ghost/api/v5/content/posts/slug/{slug}/?key={key}&include=tags,authors
  - GET /ghost/api/v5/content/authors/?key={key}
  - GET /ghost/api/v5/content/tags/?key={key}
- Caching: CDN + ISR; s-maxage=300, stale-while-revalidate=86400.
- Error Handling: Circuit breaker with fallback to cached content; log to Sentry.
- Observability: Record latency, error rate, and cache hit ratio; tag spans as content_api.
- SLA Targets: p95 latency < 400ms (edge cached), error rate < 1%.

---

## INT-002 Ghost Admin API
- Purpose: Authenticated operations (if needed later): programmatic post creation, updates, publishing.
- Protocol: HTTPS REST + JWT (Admin API).
- Auth: Admin API Key signed JWT.
- Key Endpoints: /ghost/api/admin/* (v5).
- Security: Secrets server-side only; key rotation; Vercel encrypted env storage.
- Rate Limiting: Respect Ghost limits; exponential backoff on 429 responses.
- Observability: Audit logs for mutations; Sentry breadcrumbs on failures.
- Access Control: Restrict to CI automations and privileged admin routes.

---

## INT-003 Ghost Webhooks (ISR)
- Purpose: Trigger Incremental Static Regeneration after content publishes/updates.
- Events: post.published, post.unpublished, post.updated.
- Delivery: Ghost → Next.js API route (/api/revalidate) or Vercel revalidation endpoint.
- Security: HMAC signature verification; IP allowlist for Ghost; replay protection.
- Retry: Idempotent revalidation on duplicate deliveries; 2-step confirm logging.
- Monitoring: Log revalidation latency and success rate; alert on failure spikes.
- SLA Targets: Revalidation execution < 2s; completion < 30s end-to-end.

---

## INT-004 Newsletter Service Abstraction
- Purpose: Unified interface for subscriber operations and campaign management.
- Service Strategy: Primary Ghost native newsletter; Fallback ConvertKit via adapter.
- TypeScript Interface:
  - subscribe(email, preferences?)
  - unsubscribe(email)
  - updatePreferences(email, prefs)
  - createCampaign(data)
  - sendCampaign(id)
  - getCampaignMetrics(id)
- Auth:
  - Ghost: internal CMS context
  - ConvertKit: API Key header; HTTPS only
- Compliance: Double opt-in; data minimization; export/delete endpoints for GDPR.
- Rate Limiting: Client-side debounce; server-side 10 req/min per IP; global burst controls.
- Observability: Track conversions, confirmation funnel drop-off, bounce/unsubscribe rates.
- SLA Targets: Confirmation email dispatch < 60s; API availability 99.9%.

---

## INT-005 Analytics (GA4 + Plausible)
- Purpose: Behavior analytics and privacy-focused stats for business intelligence.
- GA4: gtag with consent mode; custom events:
  - newsletter_signup, read_time_seconds, share_click, scroll_depth, cta_click, author_follow
- Plausible: Lightweight script with mirrored custom events where applicable.
- Data Policy: Respect Do Not Track and consent; anonymize IPs; regional data residency if required.
- KPIs: Subscriber growth, open rate (from newsletter provider), engagement depth, conversion funnels.
- Security: Do not send PII; event payload validation.
- SLA Targets: Analytics script impact < 50ms main thread blocking on mobile.

---

## INT-006 Social Sharing and Promotion
- Sharing: Open Graph and Twitter Card meta tags per article/author.
- Auto-posting (Phase 2+): Optional integration to Twitter/X and LinkedIn via API.
- Security: Secure storage of tokens; least privilege scopes; rotation policy.
- Monitoring: Track share clicks and referral traffic using UTM attribution and analytics events.
- Fallback: Manual scheduling through social tools if API quotas or auth fail.

---

## INT-007 SEO Interfaces (Sitemaps & Structured Data)
- Sitemaps: /sitemap.xml, /sitemap-articles.xml, /sitemap-authors.xml regenerated on ISR events.
- Robots: /robots.txt aligned with crawl and staging policy.
- Structured Data: JSON-LD for Article and Person (author) on relevant pages.
- Validation: Automated checks in CI:
  - Lighthouse (score ≥ 95)
  - Schema.org validator checks
  - Broken link scanner
- SLA Targets: Sitemap freshness < 5 minutes post publish; zero blocking robots rules in prod.

---

## INT-008 Error Handling and Observability
- Logging: Structured logs with request IDs and correlation IDs for cross-service tracing.
- Tracing: Optional OpenTelemetry spans for outbound calls (content, newsletter, social).
- Metrics: Latency, error rate, cache hit rate, revalidation success rate, newsletter API success rate.
- Alerting: Threshold-based alerts for spike in 5xx, webhook failures, or prolonged cache staleness.
- Dashboards: Per-integration panels (content, newsletter, webhooks) with SLO displays.

---

## INT-009 Rate Limiting and Abuse Protection
- Public API Routes (e.g., /api/newsletter/subscribe):
  - 10 requests/minute per IP
  - Burst capacity: 20 requests with token bucket
  - 429 response with Retry-After on exceed
- Bot Protection:
  - Honeypot fields on forms
  - Optional CAPTCHA (threshold-triggered)
  - Email validation with disposable domain blacklist (privacy-respecting)
- Observability: Track throttled requests, bot signatures, form spam attempts.

---

## INT-010 Security and Compliance Controls
- Transport Security: TLS 1.3 only; HSTS headers; secure cookies; SameSite=Lax.
- App Security Headers:
  - X-Frame-Options: DENY
  - X-Content-Type-Options: nosniff
  - Referrer-Policy: strict-origin-when-cross-origin
  - Content Security Policy (CSP): strict default-src 'self' with explicit analytics/media domains.
- Data Protection:
  - Data minimization for subscribers (email + optional preferences)
  - Double opt-in; unsubscribe links in all emails
  - Data export and deletion endpoints
  - Audit trails for admin actions and data operations
- Key Management: Rotate API keys quarterly; Vercel encrypted env; no secrets client-side.
- GDPR: Consent management, privacy policy, DSR processes published.

---

## Environment Variables (Required)
- GHOST_API_URL
- GHOST_CONTENT_API_KEY
- GHOST_ADMIN_API_KEY
- CONVERTKIT_API_KEY
- NEXT_PUBLIC_GA_ID
- NEXT_PUBLIC_PLAUSIBLE_DOMAIN
- SENTRY_DSN
- NEXTAUTH_SECRET
- NEXTAUTH_URL

---

## Testing & Validation
- Contract tests with mocked Ghost (content/admin) and ConvertKit endpoints.
- E2E tests: newsletter signup flow, double opt-in path, ISR revalidation on publish.
- Synthetic tests: webhook delivery reliability and HMAC verification.
- Performance: Lighthouse CI ≥ 95; Core Web Vitals thresholds enforced (LCP < 2.5s, CLS < 0.1, TTI < 3s).
- Security: Automated headers check; dependency audit in CI; basic DAST on public routes.

---

## Operational Runbooks (Brief)
- Webhook Failures: Inspect Sentry logs → replay last event with signed payload → verify ISR completion.
- Newsletter API Errors: Check rate limits → degrade to queue/retry → post-mortem with metrics.
- Analytics Discrepancies: Validate consent state → compare GA4 vs Plausible deltas → fix tag configuration.
- SEO Regressions: Run sitemap and schema validators → check robots/CSP → revalidate affected pages.

---

Generated to satisfy Phase 1 — 1.1 Project Architecture & Planning deliverables and to support subsequent implementation tasks with clear integration contracts.