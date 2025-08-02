# ARTOfficial Intelligence Academy - Contributor Guide

## Project Overview

ARTOfficial Intelligence Academy is a premium blog and newsletter platform targeting AI professionals. Built with performance and authority in mind, we aim to achieve 25,000 newsletter subscribers within 12 months through high-quality, curated content.

**Business Objectives**: Premium positioning, 35%+ newsletter open rate, 100k monthly visitors by Month 12, <2s global page loads.

## Repository Structure & Navigation

### Core Application Structure (Next.js 15 App Router)
```
├── src/
│   ├── app/                    # App Router pages and layouts
│   │   ├── (blog)/            # Blog-related routes
│   │   ├── authors/           # Author profile pages
│   │   ├── newsletter/        # Newsletter management
│   │   └── api/               # API routes (newsletter, webhooks)
│   ├── components/            # Reusable UI components
│   │   ├── ui/               # Base UI components (Tailwind)
│   │   ├── blog/             # Blog-specific components
│   │   ├── newsletter/       # Newsletter components
│   │   └── layout/           # Layout components
│   ├── lib/                  # Core utilities and services
│   │   ├── ghost/            # Ghost CMS integration
│   │   ├── newsletter/       # Newsletter service abstraction
│   │   ├── analytics/        # Analytics integration
│   │   └── utils/            # Helper functions
│   └── types/                # TypeScript type definitions
├── public/                   # Static assets
├── content/                  # Markdown content (if needed)
└── docs/                     # Project documentation
```

### Key Navigation Tips
- Use `src/app/` for all page components (App Router pattern)
- Find API endpoints in `src/app/api/` - these handle newsletter signups, webhooks, etc.
- Component library lives in `src/components/ui/` - leverage existing components first
- Ghost CMS integration logic is in `src/lib/ghost/` 
- Newsletter functionality is abstracted in `src/lib/newsletter/`

## Development Environment Setup

### Essential Tools & Commands
```bash
# Install dependencies
npm install

# Development server
npm run dev

# Type checking
npm run type-check

# Linting and formatting
npm run lint
npm run format

# Testing suite
npm run test
npm run test:e2e
npm run test:performance

# Build and deployment
npm run build
npm run start
```

### Environment Variables (.env.local)
```bash
# Ghost CMS Integration
GHOST_API_URL=your_ghost_instance_url
GHOST_CONTENT_API_KEY=your_content_api_key
GHOST_ADMIN_API_KEY=your_admin_api_key

# Newsletter Service (ConvertKit fallback)
CONVERTKIT_API_KEY=your_convertkit_key

# Analytics
NEXT_PUBLIC_GA_ID=your_ga4_id
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=artofficialintelligence.academy

# Error Tracking
SENTRY_DSN=your_sentry_dsn
```

### Development Workflow
1. Create feature branch from `main`
2. Implement changes with tests
3. Run full validation suite (see Testing section)
4. Create PR with preview deployment
5. Code review and merge to `main`

## Code Quality Standards

### TypeScript Configuration
- **Strict Mode**: Always enabled - no `any` types allowed
- **Path Mapping**: Use `@/` prefix for imports (`@/components`, `@/lib`, etc.)
- **Type Safety**: Define interfaces for all API responses and component props
- **Error Handling**: Use Result types or proper error boundaries

### Component Architecture Patterns
```typescript
// Preferred component structure
interface ComponentProps {
  title: string
  variant?: 'primary' | 'secondary'
  className?: string
}

export function Component({ 
  title, 
  variant = 'primary', 
  className 
}: ComponentProps) {
  return (
    <div className={cn('base-styles', variant === 'primary' && 'primary-styles', className)}>
      {title}
    </div>
  )
}
```

### Styling Standards
- **Tailwind CSS**: Use utility-first approach, leverage existing design system
- **Responsive Design**: Mobile-first with `sm:`, `md:`, `lg:` breakpoints
- **Component Variants**: Use `clsx`/`cn` utility for conditional styling
- **Design Tokens**: Follow established spacing, colors, and typography scales

### API Route Patterns
```typescript
// API route structure (src/app/api/example/route.ts)
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    // Validation
    if (!isValidData(data)) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }
    
    // Business logic
    const result = await processData(data)
    
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

## Testing & Validation Strategy

### Testing Requirements (Run Before Every Commit)
```bash
# 1. Type checking and linting
npm run type-check
npm run lint

# 2. Unit and integration tests
npm run test

# 3. E2E testing (critical paths)
npm run test:e2e

# 4. Performance validation
npm run lighthouse

# 5. Security scanning
npm audit
```

### Testing Patterns
- **Unit Tests**: Jest + React Testing Library for components
- **Integration Tests**: API route testing with MSW (Mock Service Worker)
- **E2E Tests**: Cypress for critical user flows (newsletter signup, content reading)
- **Performance Tests**: Lighthouse CI with score >95 requirement

### Critical Test Scenarios
1. **Newsletter Signup Flow**: Form submission, validation, API integration
2. **Content Loading**: Ghost API integration, image optimization, SEO metadata
3. **Mobile Responsiveness**: Touch interactions, readable typography
4. **Performance**: Page load times <2s, Core Web Vitals compliance

### Performance Validation Checklist
- [ ] Lighthouse Performance Score >95
- [ ] First Contentful Paint <1.5s
- [ ] Largest Contentful Paint <2.0s
- [ ] Cumulative Layout Shift <0.1
- [ ] Time to Interactive <3.0s
- [ ] Image optimization working (WebP/AVIF formats)

## Integration Patterns & Services

### Ghost CMS Integration
```typescript
// Ghost API service pattern (src/lib/ghost/api.ts)
import GhostContentAPI from '@tryghost/content-api'

const ghostAPI = new GhostContentAPI({
  url: process.env.GHOST_API_URL!,
  key: process.env.GHOST_CONTENT_API_KEY!,
  version: 'v5.0'
})

// With circuit breaker pattern for reliability
export async function getPostsWithFallback(): Promise<Post[]> {
  try {
    return await circuitBreaker.call(() => ghostAPI.posts.browse())
  } catch (error) {
    console.warn('Ghost API unavailable, serving cached content')
    return await getCachedPosts()
  }
}
```

### Newsletter Service Integration
- **Primary**: Ghost Native Newsletter (integrated with CMS)
- **Fallback**: ConvertKit API for advanced segmentation
- **Pattern**: Service abstraction layer for easy switching

### Analytics Integration
- **Google Analytics 4**: Comprehensive tracking with consent management
- **Plausible**: Privacy-focused analytics for GDPR compliance
- **Custom Events**: Newsletter signups, article reading time, social shares

### Error Handling Patterns
```typescript
// Error boundaries for React components
// Circuit breakers for external API calls
// Graceful degradation for non-critical features
// Comprehensive logging with Sentry integration
```

## Performance Optimization Guidelines

### Image Optimization
- Use Next.js `Image` component for automatic optimization
- Implement lazy loading with intersection observer
- Serve WebP/AVIF formats when supported
- Optimize images for multiple device sizes

### Caching Strategy
```typescript
// Static assets: max-age=31536000, immutable
// Dynamic pages: s-maxage=300, stale-while-revalidate=86400
// API responses: s-maxage=60, stale-while-revalidate=300
```

### Bundle Optimization
- Code splitting with dynamic imports
- Tree shaking for unused exports
- Bundle analysis with `@next/bundle-analyzer`
- Minimize JavaScript bundle size

### CDN & Deployment
- Vercel Edge Network for global distribution
- ISR (Incremental Static Regeneration) for content updates
- Edge functions for API routes when applicable

## Security & Compliance Implementation

### Security Headers (next.config.js)
```javascript
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' }
]
```

### GDPR Compliance Checklist
- [ ] Cookie consent management implemented
- [ ] Newsletter double opt-in process
- [ ] User data export/deletion API endpoints
- [ ] Privacy policy integration
- [ ] Data minimization principles followed

### API Security
- Rate limiting on public endpoints (10 requests/minute)
- Input validation and sanitization
- CORS policy enforcement
- API key rotation procedures

## Content Management Workflow

### Article Creation Process
1. Author creates content in Ghost CMS
2. Editorial review and approval workflow
3. SEO optimization (meta tags, structured data)
4. Webhook triggers ISR for immediate updates
5. Social media auto-posting integration

### Newsletter Campaign Workflow
1. Content curation from recent articles
2. Newsletter design in Ghost or ConvertKit
3. A/B testing for subject lines
4. Scheduled delivery with segmentation
5. Performance tracking and optimization

## Deployment & CI/CD

### Automated Pipeline (GitHub Actions)
```yaml
# .github/workflows/deploy.yml triggers on:
# 1. Code quality checks (lint, type-check)
# 2. Testing suite (unit, integration, E2E)
# 3. Security scanning (Snyk/Dependabot)
# 4. Performance validation (Lighthouse CI)
# 5. Deployment to Vercel
```

### Environment Management
- **Development**: Local with hot reload
- **Preview**: Automatic preview deployments for all PRs
- **Staging**: Manual deployment for UAT
- **Production**: Automatic deployment from `main` branch

### Monitoring & Alerting
- **Error Tracking**: Sentry for runtime errors
- **Performance**: Vercel Analytics + Core Web Vitals
- **Uptime**: External monitoring for 99.9% availability
- **Business Metrics**: Newsletter growth, engagement rates

## Work Presentation Standards

### Pull Request Format
```markdown
## Summary
Brief description of changes and motivation

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Performance improvement
- [ ] Refactor
- [ ] Documentation update

## Testing Completed
- [ ] Unit tests pass
- [ ] E2E tests pass
- [ ] Performance validation (Lighthouse >95)
- [ ] Manual testing on mobile
- [ ] Accessibility testing

## Deployment Notes
Any special deployment requirements or environment variable changes

## Screenshots/Videos
For UI changes, include visual evidence
```

### Commit Message Standards
```
type(scope): brief description

feat(newsletter): add subscriber segmentation
fix(blog): resolve image optimization issue
perf(api): optimize Ghost API response caching
docs(readme): update development setup guide
```

### Code Documentation Requirements
- JSDoc comments for all public functions
- README files for complex features
- Architecture Decision Records (ADRs) for major decisions
- API documentation with examples

## Business Context & Priorities

### Success Metrics to Consider
- Newsletter subscriber growth (target: 25k in 12 months)
- Newsletter engagement (target: 35%+ open rate)
- Website traffic (target: 100k monthly visitors)
- Page load performance (<2s globally)
- Search rankings for AI-related keywords

### Content Quality Standards
- Author credibility verification
- Citation and fact-checking requirements
- SEO optimization for organic discovery
- Mobile-first user experience
- Accessibility compliance (WCAG 2.1 AA)

### Technical Debt Management
- Monthly dependency updates
- Quarterly performance audits
- Regular security assessments
- Code quality monitoring with SonarCloud

---

## Quick Reference Commands

### Development
```bash
npm run dev              # Start development server
npm run build           # Production build
npm run type-check      # TypeScript validation
npm run lint           # ESLint + Prettier
```

### Testing
```bash
npm test               # Unit tests
npm run test:e2e       # Cypress E2E tests
npm run test:perf      # Lighthouse performance
npm run test:security  # Security scanning
```

### Content Management
```bash
npm run content:sync   # Sync from Ghost CMS
npm run newsletter:test # Test newsletter integration
npm run sitemap:generate # Update XML sitemap
```

Remember: This is a premium platform focused on quality over quantity. Every feature should enhance user experience and support the goal of building authority in the AI education space.
