import type { NewsletterProvider, SubscribeRequest, SubscribeResult } from '../types';

/**
 * ConvertKit Newsletter Provider
 * Uses API: POST /v3/forms/{FORM_ID}/subscribe
 * Docs: https://developers.convertkit.com/
 */
export class ConvertKitNewsletterProvider implements NewsletterProvider {
  name = 'convertkit' as const;

  async subscribe(req: SubscribeRequest): Promise<SubscribeResult> {
    const apiKey = process.env.CONVERTKIT_API_KEY!;
    const formId = process.env.CONVERTKIT_FORM_ID!;
    const base = process.env.CONVERTKIT_API_BASE || 'https://api.convertkit.com';

    // Map tags/source/ref to ConvertKit fields:
    // - tags: ConvertKit supports tag_ids separately; since we only have names here,
    //   projects typically pre-map names to ids. For now, we pass via fields metadata.
    // - source/ref: attach as custom_fields metadata as well.
    const url = `${base}/v3/forms/${encodeURIComponent(formId)}/subscribe`;

    const payload = {
      api_key: apiKey,
      email: req.email,
      // ConvertKit supports fields as a bag of key/values
      fields: {
        source: req.source || '',
        ref: req.ref || '',
        tags: (req.tags || []).join(','),
        double_opt_in: req.doubleOptIn ? 'true' : 'false',
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // No PII in logs; do not include email in logs
      },
      body: JSON.stringify(payload),
    });

    // ConvertKit returns 200 on success with body indicating subscription status
    // See https://developers.convertkit.com/#subscribe-to-a-form
    if (res.status === 200) {
      // Attempt to infer idempotency from response
      const data: unknown = await res.json().catch(() => ({}));
      // We avoid depending on exact schema; treat 200 as "subscribed" (idempotent allowed)
      const result: SubscribeResult = {
        status: 'subscribed',
        provider: this.name,
        idempotent: true, // ConvertKit treats re-subscribes as idempotent
        meta: {
          httpStatus: 200,
          ok: true,
        },
      };
      return result;
    }

    // Conflict or already subscribed equivalent
    if (res.status === 409) {
      const result: SubscribeResult = {
        status: 'already_subscribed',
        provider: this.name,
        idempotent: true,
        meta: {
          httpStatus: 409,
        },
      };
      return result;
    }

    // Some instances may return 201 for created resources
    if (res.status === 201) {
      const result: SubscribeResult = {
        status: 'subscribed',
        provider: this.name,
        idempotent: false,
        meta: {
          httpStatus: 201,
        },
      };
      return result;
    }

    // For double opt-in configurations, some APIs may indicate pending-like flows.
    if (res.status === 202) {
      const result: SubscribeResult = {
        status: 'pending',
        provider: this.name,
        idempotent: false,
        meta: {
          httpStatus: 202,
        },
      };
      return result;
    }

    // Fallback: treat non-2xx as provider error; let route map to 500
    throw new Error(`ConvertKit subscribe failed with status ${res.status}`);
  }
}