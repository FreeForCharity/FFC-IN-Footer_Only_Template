import { test, expect } from '@playwright/test'

/**
 * Policy page smoke tests
 *
 * Verifies that all legal/policy pages load correctly, render their headings,
 * and are reachable from the footer Quick Links section.
 */

const policyPages = [
  { path: '/privacy-policy', heading: 'Privacy Policy' },
  { path: '/cookie-policy', heading: 'Cookie Policy' },
  { path: '/terms-of-service', heading: 'Terms of Service' },
  { path: '/donation-policy', heading: 'Donation Policy' },
  { path: '/free-for-charity-donation-policy', heading: 'Free For Charity Donation Policy' },
  { path: '/security-acknowledgements', heading: 'Security Acknowledgements' },
  {
    path: '/vulnerability-disclosure-policy',
    heading: 'Vulnerability Disclosure Policy',
  },
]

test.describe('Policy pages', () => {
  for (const { path, heading } of policyPages) {
    test(`${heading} page loads and renders heading`, async ({ page }) => {
      const response = await page.goto(path)
      expect(response?.status()).toBe(200)

      const h = page.getByRole('heading', { name: heading })
      await expect(h).toBeVisible()
    })
  }

  test('footer contains links to policy pages', async ({ page }) => {
    await page.goto('/')
    const footer = page.locator('footer')

    // Check that key policy links exist in the footer
    const expectedLinks = ['Privacy Policy', 'Cookie Policy', 'Terms of Service', 'Donation Policy']

    for (const linkText of expectedLinks) {
      const link = footer.getByRole('link', { name: linkText })
      await expect(link).toBeVisible()
    }
  })
})
