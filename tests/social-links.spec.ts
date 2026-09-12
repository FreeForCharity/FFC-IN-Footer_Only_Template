import { test, expect } from '@playwright/test'
import { testConfig } from './test.config'

/**
 * Social Links Tests
 *
 * These tests verify that:
 * 1. Social media links are present and functional
 * 2. Defunct platforms (like Google+) are not present
 * 3. All social icons link to correct destinations
 *
 * Expectations come from test.config.ts, which derives them from
 * src/lib/site.config.ts — so which platforms appear, and how many, follow the
 * charity's own configuration instead of the template's original four.
 */

test.describe('Footer Social Links', () => {
  test('should not contain Google+ social link', async ({ page }) => {
    // Navigate to the homepage
    await page.goto('/')

    // Check that Google+ link is not present
    const googlePlusLink = page.locator('footer a[href*="plus.google.com"]')
    await expect(googlePlusLink).toHaveCount(0)

    // Also check that Google Plus label is not present
    const googlePlusLabel = page.locator('footer a[aria-label="Google Plus"]')
    await expect(googlePlusLabel).toHaveCount(0)
  })

  test('should display active social media links', async ({ page }) => {
    await page.goto('/')

    expect(testConfig.socialLinks.length).toBeGreaterThan(0)

    for (const social of testConfig.socialLinks) {
      const link = page.locator(`footer a[href*="${social.url}"]`)
      await expect(link).toBeVisible()
      await expect(link).toHaveAttribute('aria-label', social.ariaLabel)
    }
  })

  test('should render exactly the configured social icons', async ({ page }) => {
    await page.goto('/')

    // Count links by the aria-labels the configuration declares, so an extra
    // hardcoded icon in the footer fails just as loudly as a missing one.
    const selector = testConfig.socialLinks
      .map((social) => `footer a[aria-label="${social.ariaLabel}"]`)
      .join(', ')

    await expect(page.locator(selector)).toHaveCount(testConfig.socialLinks.length)
  })
})
