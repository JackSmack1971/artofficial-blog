import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import './globals.css'

/**
 * Business-optimized metadata for authority and SEO
 */
export const metadata: Metadata = {
  metadataBase: new URL('https://artofficialintelligence.academy'),
  title: {
    default: 'ARTOfficial Intelligence Academy',
    template: '%s | ARTOfficial Intelligence Academy',
  },
  description:
    'Premium blog and newsletter platform for AI professionals. Performance-first, content-centric, and built for scale.',
  alternates: { canonical: '/' },
  openGraph: {
    siteName: 'ARTOfficial Intelligence Academy',
    type: 'website',
    locale: 'en_US',
  },
  robots: { index: true, follow: true },
}

/**
 * Performance-first viewport and theme setup
 */
export const viewport: Viewport = {
  themeColor: [{ color: '#000000' }, { color: '#ffffff', media: '(prefers-color-scheme: light)' }],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

function AnalyticsBoot() {
  // Client-side: lightweight analytics bootstrap with queue for BI events
  // Avoids bundling heavy analytics libs in main path. GA/Plausible ready.
  return (
    <>
      {/* Plausible (deferred) */}
      {process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN ? (
        <Script
          src="https://plausible.io/js/script.js"
          data-domain={process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN}
          strategy="lazyOnload"
        />
      ) : null}

      {/* Google Analytics (deferred) */}
      {process.env.NEXT_PUBLIC_GA_ID ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
            strategy="lazyOnload"
          />
          <Script id="ga-init" strategy="lazyOnload">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}', { anonymize_ip: true });
            `}
          </Script>
        </>
      ) : null}

      {/* Business Intelligence Event Bus (queue + flush) */}
      <Script id="bi-bus" strategy="afterInteractive">
        {`
          (function() {
            const w = window;
            if (w.__bi) return;
            const q = [];
            const subs = new Set();
            function emit(event) {
              try {
                subs.forEach(fn => fn(event));
              } catch(e) {}
            }
            const bi = {
              q,
              on(fn) { subs.add(fn); return () => subs.delete(fn); },
              emit,
              track(type, payload) {
                const evt = { type, payload, ts: Date.now() };
                q.push(evt);
                emit(evt);
                // fan-out: Plausible
                if (w.plausible) {
                  try { w.plausible(type, { props: payload || {} }); } catch(e) {}
                }
                // fan-out: GA4
                if (w.gtag) {
                  try { w.gtag('event', type, payload || {}); } catch(e) {}
                }
              }
            };
            w.__bi = bi;

            // Page view helper
            function pageView() {
              const path = location.pathname + location.search;
              bi.track('page_view', { path });
            }

            // Initial page_view after hydration
            if (document.readyState !== 'loading') pageView();
            else addEventListener('DOMContentLoaded', pageView);

            // Web Vitals (core business-performance correlation)
            try {
              const po = new PerformanceObserver((list) => {
                list.getEntries().forEach((entry) => {
                  if (entry.entryType === 'largest-contentful-paint') {
                    bi.track('perf_vitals', { name: 'LCP', value: entry.startTime });
                  } else if (entry.entryType === 'layout-shift') {
                    const cls = entry.value;
                    if (!entry.hadRecentInput) {
                      bi.track('perf_vitals', { name: 'CLS', value: cls });
                    }
                  }
                });
              });
              po.observe({ type: 'largest-contentful-paint', buffered: true });
              po.observe({ type: 'layout-shift', buffered: true });
            } catch (e) {}
          })();
        `}
      </Script>
    </>
  )
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AnalyticsBoot />
        <div className="container mx-auto px-4">
          {children}
        </div>
        {/* NoScript analytics fallbacks */}
        <noscript>
          <img
            alt=""
            height="1"
            width="1"
            style={{ display: 'none' }}
            src={process.env.NEXT_PUBLIC_GA_ID ? `https://www.google-analytics.com/collect?v=1&t=pageview&tid=${process.env.NEXT_PUBLIC_GA_ID}` : undefined}
          />
        </noscript>
      </body>
    </html>
  )
}