import { test, expect } from '@playwright/test'

/**
 * Minimal happy-path signup E2E (mocked submission)
 * - Assumes a newsletter form exists with data-testid="newsletter-form"
 * - Email input data-testid="newsletter-email"
 * - Submit button data-testid="newsletter-submit"
 * - Success UI data-testid="newsletter-success"
 *
 * If real API exists, replace mock with actual route interception/verification.
 */
test.describe('Newsletter Signup - Happy Path (Mocked)', () => {
  test('submits email and shows success state', async ({ page }) => {
    // Intercept API call and mock success (adjust path if needed)
    await page.route('**/api/newsletter*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
    })

    await page.goto('http://localhost:3000/')

    const form = page.getByTestId('newsletter-form')
    await expect(form).toBeVisible()

    const email = page.getByTestId('newsletter-email')
    await email.fill('test.user+e2e@example.com')

    const submit = page.getByTestId('newsletter-submit')
    await submit.click()

    // Expect success UI
    const success = page.getByTestId('newsletter-success')
    await expect(success).toBeVisible()
  })
})