/**
 * Newsletter service common types and error taxonomy
 * No PII should be logged. Do not export raw provider responses.
 */

export type ProviderName = 'ghost' | 'convertkit';

export type SubscribeStatus = 'pending' | 'subscribed' | 'already_subscribed';

export interface SubscribeRequest {
  email: string;
  // optional inputs (kept optional to satisfy exactOptionalPropertyTypes)
  source?: string;
  tags?: string[];
  ref?: string;
  doubleOptIn?: boolean;
  // honeypot fields (not forwarded to providers)
  company?: string;
  hp?: string;
}

export interface SubscribeResult {
  status: SubscribeStatus;
  provider: ProviderName;
  // Provider-specific identifiers if available (not PII)
  idempotent: boolean;
  meta?: Record<string, string | number | boolean | null | undefined>;
}

export type NewsletterErrorCode =
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  | 'PROVIDER_UNAVAILABLE'
  | 'INTERNAL_ERROR'
  | 'PROVIDER_ERROR';

export class NewsletterError extends Error {
  readonly code: NewsletterErrorCode;
  readonly httpStatus: number;
  constructor(code: NewsletterErrorCode, message: string, httpStatus: number) {
    super(message);
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

export interface NewsletterProvider {
  name: ProviderName;
  subscribe(req: SubscribeRequest): Promise<SubscribeResult>;
}