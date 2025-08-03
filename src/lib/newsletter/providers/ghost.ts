import type { NewsletterProvider, SubscribeRequest, SubscribeResult } from '../types';

/**
 * Ghost Newsletter Provider (placeholder pass-through)
 *
 * IMPORTANT: This implementation does NOT include Ghost Admin authentication.
 * TODO: Implement authenticated calls to Ghost Admin API to add a member and subscribe them
 * once project-specific endpoints and secrets are finalized.
 */
export class GhostNewsletterProvider implements NewsletterProvider {
  name = 'ghost' as const;

  async subscribe(req: SubscribeRequest): Promise<SubscribeResult> {
    // Placeholder behavior:
    // - If doubleOptIn true => return pending
    // - Else => return subscribed
    // This ensures API contract works end-to-end without exposing PII or requiring admin auth now.
    const status: 'pending' | 'subscribed' = req.doubleOptIn ? 'pending' : 'subscribed';

    // Example mapping note (not executed):
    // POST {GHOST_API_URL}/ghost/api/admin/members/?source=...
    // Headers: Authorization: Ghost {admin_jwt}
    // Body: { email, name?, newsletters: [GHOST_NEWSLETTER_ID], labels: tags }
    // Response mapping:
    // - 201 Created -> subscribed (or pending if double opt-in configured on Ghost)
    // - 409 Conflict -> already_subscribed

    return {
      status,
      provider: this.name,
      // for simulated placeholder, treat as non-idempotent creation
      idempotent: false,
      meta: {
        // Provide minimal non-PII hints for debugging
        simulated: true,
      },
    };
  }
}