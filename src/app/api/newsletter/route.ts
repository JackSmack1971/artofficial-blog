import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getNewsletterProvider } from '@/lib/newsletter/newsletter.provider';
import type { SubscribeRequest, SubscribeResult } from '@/lib/newsletter/types';

// Ensure Node runtime (not edge)
export const runtime = 'nodejs';

// In-memory rate limiter (per-IP sliding window)
type IpKey = string;
const requestsByIp: Map<IpKey, number[]> = new Map();

function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

function rateLimit(ip: string, limit: number, windowSec: number): { allowed: boolean; retryAfter?: number } {
  const ts = nowSec();
  const arr = requestsByIp.get(ip) || [];
  const cutoff = ts - windowSec;
  const recent = arr.filter((t) => t > cutoff);
  recent.push(ts);
  requestsByIp.set(ip, recent);
  if (recent.length <= limit) {
    return { allowed: true };
  }
  const oldest = recent[0]!;
  const retryAfter = windowSec - (ts - oldest);
  return { allowed: false, retryAfter: Math.max(1, retryAfter) };
}

// Validation helpers
const CHARSET_RE = /^[A-Za-z0-9._/\-]+$/;
const EMAIL_RE =
  // Light RFC 5322-inspired; practical for most emails, lower-cased beforehand.
  /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/;

const MAX_BODY_BYTES = 5 * 1024; // 5KB
const MAX_SOURCE_LEN = 64;
const MAX_REF_LEN = 128;
const MAX_TAGS = 10;
const TAG_LEN_MIN = 1;
const TAG_LEN_MAX = 32;

function makeResponse(
  status: number,
  body: Record<string, unknown>,
  requestId: string,
  extraHeaders?: Record<string, string>
) {
  return new NextResponse(JSON.stringify({ requestId, ...body }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Request-ID': requestId,
      ...(extraHeaders || {}),
    },
  });
}

function getRequestId(req: NextRequest): string {
  const hdr = req.headers.get('x-request-id');
  // Basic sanitation, generate if missing
  if (hdr && hdr.length > 0 && hdr.length <= 128) return hdr;
  // Cheap unique id
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

async function readJsonWithLimit(req: NextRequest): Promise<unknown> {
  const contentType = req.headers.get('content-type') || '';
  if (!contentType.toLowerCase().startsWith('application/json')) {
    throw { code: 'VALIDATION_ERROR', message: 'Content-Type must be application/json' };
  }

  const raw = await req.text();
  const encoder = new TextEncoder();
  const byteLength = encoder.encode(raw).length;
  if (byteLength > MAX_BODY_BYTES) {
    throw { code: 'VALIDATION_ERROR', message: 'Request body too large' };
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw { code: 'VALIDATION_ERROR', message: 'Invalid JSON' };
  }
}

function validatePayload(obj: unknown): SubscribeRequest & { honeypotHit: boolean } {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    throw { code: 'VALIDATION_ERROR', message: 'Body must be a JSON object' };
  }
  const allowed = new Set(['email', 'source', 'tags', 'ref', 'doubleOptIn', 'company', 'hp']);
  for (const key of Object.keys(obj as Record<string, unknown>)) {
    if (!allowed.has(key)) {
      throw { code: 'VALIDATION_ERROR', message: `Unknown field: ${key}` };
    }
  }

  const body = obj as Record<string, unknown>;
  // email
  if (typeof body.email !== 'string') {
    throw { code: 'VALIDATION_ERROR', message: 'email is required' };
  }
  const email = body.email.trim().toLowerCase();
  if (email.length < 5 || email.length > 254 || !EMAIL_RE.test(email)) {
    throw { code: 'VALIDATION_ERROR', message: 'Invalid email' };
  }

  // optional fields
  let source: string | undefined;
  if (body.source !== undefined) {
    if (typeof body.source !== 'string') throw { code: 'VALIDATION_ERROR', message: 'source must be a string' };
    if ((body.source as string).length > MAX_SOURCE_LEN) throw { code: 'VALIDATION_ERROR', message: 'source too long' };
    if (!CHARSET_RE.test(body.source as string)) throw { code: 'VALIDATION_ERROR', message: 'source has invalid characters' };
    source = body.source as string;
  }

  let ref: string | undefined;
  if (body.ref !== undefined) {
    if (typeof body.ref !== 'string') throw { code: 'VALIDATION_ERROR', message: 'ref must be a string' };
    if ((body.ref as string).length > MAX_REF_LEN) throw { code: 'VALIDATION_ERROR', message: 'ref too long' };
    if (!CHARSET_RE.test(body.ref as string)) throw { code: 'VALIDATION_ERROR', message: 'ref has invalid characters' };
    ref = body.ref as string;
  }

  let tags: string[] | undefined;
  if (body.tags !== undefined) {
    if (!Array.isArray(body.tags)) throw { code: 'VALIDATION_ERROR', message: 'tags must be an array' };
    if ((body.tags as unknown[]).length > MAX_TAGS) throw { code: 'VALIDATION_ERROR', message: 'too many tags' };
    const out: string[] = [];
    for (const t of body.tags as unknown[]) {
      if (typeof t !== 'string') throw { code: 'VALIDATION_ERROR', message: 'invalid tag' };
      if (t.length < TAG_LEN_MIN || t.length > TAG_LEN_MAX) {
        throw { code: 'VALIDATION_ERROR', message: 'tag length out of bounds' };
      }
      if (!CHARSET_RE.test(t)) throw { code: 'VALIDATION_ERROR', message: 'tag has invalid characters' };
      out.push(t);
    }
    tags = out;
  }

  let doubleOptIn: boolean | undefined;
  if (body.doubleOptIn !== undefined) {
    if (typeof body.doubleOptIn !== 'boolean') {
      throw { code: 'VALIDATION_ERROR', message: 'doubleOptIn must be boolean' };
    }
    doubleOptIn = body.doubleOptIn as boolean;
  }

  // honeypot detection
  const honeypotHit =
    (typeof body.company === 'string' && (body.company as string).trim().length > 0) ||
    (typeof body.hp === 'string' && (body.hp as string).trim().length > 0);

  return {
    email,
    source,
    tags,
    ref,
    doubleOptIn,
    company: typeof body.company === 'string' ? (body.company as string) : undefined,
    hp: typeof body.hp === 'string' ? (body.hp as string) : undefined,
    honeypotHit,
  } as SubscribeRequest & { honeypotHit: boolean };
}

function mapResultToHttp(res: SubscribeResult) {
  if (res.status === 'already_subscribed') {
    return { status: 200 };
  }
  return { status: 201 };
}

/**
 * Lightweight deterministic test-mode, gated by NEWSLETTER_TEST_MODE === '1'.
 * - Skips rate limiting and real provider calls
 * - Validates payload using existing validators
 * - Returns 201 for first-time email, 200 for repeat submissions (already_subscribed)
 * - Preserves honeypot behavior
 * Note: In-memory state is fine for E2E since tests run in a single process.
 */
const testModeSeenEmails: Set<string> = new Set();

export async function POST(req: NextRequest) {
  const requestId = getRequestId(req);

  try {
    const isTestMode = process.env.NEWSLETTER_TEST_MODE === '1';

    // In test mode, skip rate limiting; otherwise enforce it
    if (!isTestMode) {
      const ip =
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        '0.0.0.0';

      const limit = Number(process.env.NEWSLETTER_RATE_LIMIT_PER_IP || '10');
      const windowSec = Number(process.env.NEWSLETTER_RATE_LIMIT_WINDOW_SEC || '60');
      const rl = rateLimit(ip, limit, windowSec);
      if (!rl.allowed) {
        return makeResponse(
          429,
          { error: 'RATE_LIMITED', message: 'Rate limit exceeded' },
          requestId,
          { 'Retry-After': String(rl.retryAfter || windowSec) }
        );
      }
    }

    const bodyUnknown = await readJsonWithLimit(req);
    const payload = validatePayload(bodyUnknown);

    // Honeypot short-circuit (unchanged in test mode)
    if (payload.honeypotHit) {
      return makeResponse(
        201,
        {
          success: true,
          status: 'pending',
          provider: 'honeypot',
        },
        requestId
      );
    }

    if (isTestMode) {
      // Deterministic responses conforming to SubscribeResult
      if (testModeSeenEmails.has(payload.email)) {
        return makeResponse(
          200,
          {
            success: true,
            status: 'already_subscribed',
            provider: 'test',
          },
          requestId
        );
      }
      testModeSeenEmails.add(payload.email);
      return makeResponse(
        201,
        {
          success: true,
          status: payload.doubleOptIn ? 'pending' : 'subscribed',
          provider: 'test',
        },
        requestId
      );
    }

    // Production path (unchanged)
    const provider = await getNewsletterProvider();
    if (!provider) {
      return makeResponse(503, { error: 'PROVIDER_UNAVAILABLE', message: 'No newsletter provider configured' }, requestId);
    }

    const forward: SubscribeRequest = {
      email: payload.email,
      ...(payload.source !== undefined ? { source: payload.source } : {}),
      ...(payload.tags !== undefined ? { tags: payload.tags } : {}),
      ...(payload.ref !== undefined ? { ref: payload.ref } : {}),
      ...(payload.doubleOptIn !== undefined ? { doubleOptIn: payload.doubleOptIn } : {}),
    };

    const result = await provider.subscribe(forward);
    const http = mapResultToHttp(result);

    return makeResponse(http.status, { success: true, ...result }, requestId);
  } catch (err: unknown) {
    // Avoid PII in logs
    // eslint-disable-next-line no-console
    console.error('Newsletter API error', { code: (err as any)?.code, message: (err as any)?.message });

    const code = (err as any)?.code as string | undefined;
    const message = (err as any)?.message as string | undefined;

    if (code === 'VALIDATION_ERROR') {
      return makeResponse(400, { error: 'VALIDATION_ERROR', message: message || 'Invalid request' }, requestId);
    }

    return makeResponse(500, { error: 'INTERNAL_ERROR', message: 'Internal server error' }, requestId);
  }
}