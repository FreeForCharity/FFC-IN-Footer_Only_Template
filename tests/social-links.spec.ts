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

    // A fork may disable every social link (an empty href is the documented
    // "off" state in SiteConfig), and that is a correct configuration, not a
    // failure. Requiring at least one made such a fork fail here.
    test.skip(
      testConfig.socialLinks.length === 0,
      'No social links are enabled for this site; the disabled-icon case is asserted below.'
    )

    for (const social of testConfig.socialLinks) {
      const link = page.locator(`footer a[href*="${social.url}"]`)
      await expect(link).toBeVisible()
      await expect(link).toHaveAttribute('aria-label', social.ariaLabel)
    }
  })

  test('should render exactly the configured social icons', async ({ page }) => {
    await page.goto('/')

    // Every label the config declares, enabled or not. Checking the full set
    // means a disabled platform that still renders an icon fails here, and it
    // keeps the selector non-empty when nothing is enabled — joining an empty
    // list produced '', which is not a valid selector.
    const selector = testConfig.allSocialLabels
      .map((label) => `footer a[aria-label="${label}"]`)
      .join(', ')

    if (selector === '') {
      // No social platforms configured at all: there is nothing to render and
      // nothing to select.
      await expect(page.locator('footer a[target="_blank"][aria-label]')).toHaveCount(0)
      return
    }

    await expect(page.locator(selector)).toHaveCount(testConfig.socialLinks.length)
  })
})
