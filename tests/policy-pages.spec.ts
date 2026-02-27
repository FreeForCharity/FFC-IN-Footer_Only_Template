import { test, expect } from '@playwright/test'

/**
 * Policy page smoke tests
 *
 * Verifies that all legal/policy pages load correctly, render their headings,
 * and are reachable from the footer with correct href attributes.
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

// Footer policy links use "Free For Charity" prefix and map to specific routes
const footerPolicyLinks = [
  { name: 'Free For Charity Donation Policy', href: '/free-for-charity-donation-policy' },
  { name: 'Free For Charity Privacy Policy', href: '/privacy-policy' },
  { name: 'Free For Charity Cookie Policy', href: '/cookie-policy' },
  { name: 'Free For Charity Terms of Service', href: '/terms-of-service' },
  {
    name: 'Free For Charity Vulnerability Disclosure Policy',
    href: '/vulnerability-disclosure-policy',
  },
  { name: 'Free For Charity Security Acknowledgement', href: '/security-acknowledgements' },
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

  test('footer contains policy links with correct hrefs', async ({ page }) => {
    await page.goto('/')
    const footer = page.locator('footer')

    for (const { name, href } of footerPolicyLinks) {
      const link = footer.getByRole('link', { name })
      await expect(link).toBeVisible()
      await expect(link).toHaveAttribute('href', href)
    }
  })
})
