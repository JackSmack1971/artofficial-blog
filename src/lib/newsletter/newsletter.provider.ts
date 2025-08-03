import { NewsletterProvider, ProviderName } from './types';

/**
 * Provider resolver with precedence:
 * 1) Explicit NEWSLETTER_PROVIDER = 'ghost' | 'convertkit' (and required vars present)
 * 2) Detect Ghost by env vars presence
 * 3) Detect ConvertKit by env vars presence
 * 4) Else return null
 *
 * NOTE: Providers are imported lazily to avoid unused deps in certain envs.
 */

function hasGhostEnv(): boolean {
  return Boolean(
    (globalThis as any).process?.env?.GHOST_API_URL &&
      (((globalThis as any).process?.env?.GHOST_CONTENT_API_KEY) || ((globalThis as any).process?.env?.GHOST_ADMIN_API_KEY))
  );
}

function hasConvertKitEnv(): boolean {
  return Boolean(
    (globalThis as any).process?.env?.CONVERTKIT_API_KEY &&
    (((globalThis as any).process?.env?.CONVERTKIT_FORM_ID) || ((globalThis as any).process?.env?.CONVERTKIT_API_BASE))
  );
}

function isProviderConfigured(name: ProviderName): boolean {
  if (name === 'ghost') return hasGhostEnv();
  if (name === 'convertkit') return hasConvertKitEnv();
  return false;
}

export async function getNewsletterProvider(): Promise<NewsletterProvider | null> {
  const explicit = (((globalThis as any).process?.env?.NEWSLETTER_PROVIDER as string) || '').toLowerCase() as ProviderName | '';
  if (explicit === 'ghost' && isProviderConfigured('ghost')) {
    const { GhostNewsletterProvider } = await import('./providers/ghost');
    return new GhostNewsletterProvider();
  }
  if (explicit === 'convertkit' && isProviderConfigured('convertkit')) {
    const { ConvertKitNewsletterProvider } = await import('./providers/convertkit');
    return new ConvertKitNewsletterProvider();
  }

  // Auto-detect fallback
  if (hasGhostEnv()) {
    const { GhostNewsletterProvider } = await import('./providers/ghost');
    return new GhostNewsletterProvider();
  }
  if (hasConvertKitEnv()) {
    const { ConvertKitNewsletterProvider } = await import('./providers/convertkit');
    return new ConvertKitNewsletterProvider();
  }

  return null;
}