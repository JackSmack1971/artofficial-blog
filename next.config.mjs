/**
 * Next.js configuration aligned with ADR-001..ADR-006
 * - Security headers
 * - Performance caching hints
 * - Bundle analyzer opt-in
 * - Image optimization defaults
 */
import { createRequire } from 'module'
const require = createRequire(import.meta.url)

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['react', 'react-dom'],
  },
  compress: true,
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    dangerouslyAllowSVG: false,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      {
        // Static assets caching (ADR-004)
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ]
  },
  // CDN/Edge friendly defaults
  output: 'standalone',
  eslint: { ignoreDuringBuilds: false },
  typescript: { ignoreBuildErrors: false },
  webpack(config, { isServer }) {
    // Smaller bundles
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        maxInitialRequests: 25,
        minSize: 20000,
      },
      runtimeChunk: 'single',
    }
    return config
  },
}

const withBundleAnalyzer = process.env.BUNDLE_ANALYZE
  ? (await import('@next/bundle-analyzer')).default({ enabled: true })
  : (cfg) => cfg

export default withBundleAnalyzer(nextConfig)