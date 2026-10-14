import { test, expect } from '@playwright/test'
import { testConfig } from './test.config'

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
  { path: '/donation-policy', heading: `${testConfig.site.name} Donation Policy` },
  { path: '/security-acknowledgements', heading: 'Security Acknowledgements' },
  {
    path: '/vulnerability-disclosure-policy',
    heading: 'Vulnerability Disclosure Policy',
  },
]

// FFC footer standard: six policy links, each labelled "<site name> <page>",
// with ONE donation policy (the separate FFC donation policy was retired).
// With trailingSlash enabled, Next.js Link renders hrefs with trailing slashes.
const footerPolicyLinks = [
  { name: `${testConfig.site.name} Donation Policy`, href: '/donation-policy/' },
  { name: `${testConfig.site.name} Privacy Policy`, href: '/privacy-policy/' },
  { name: `${testConfig.site.name} Cookie Policy`, href: '/cookie-policy/' },
  { name: `${testConfig.site.name} Terms of Service`, href: '/terms-of-service/' },
  {
    name: `${testConfig.site.name} Vulnerability Disclosure Policy`,
    href: '/vulnerability-disclosure-policy/',
  },
  { name: `${testConfig.site.name} Security Acknowledgement`, href: '/security-acknowledgements/' },
]

test.describe('Policy pages', () => {
  for (const { path, heading } of policyPages) {
    test(`${heading} page loads and renders heading`, async ({ page }) => {
      const response = await page.goto(path)
      expect(response?.status()).toBe(200)

      const h = page.getByRole('heading', { name: heading }).first()
      await expect(h).toBeVisible()
    })
  }

  test('footer contains policy links with correct hrefs', async ({ page }) => {
    await page.goto('/')
    const footer = page.locator('footer')

    for (const { name, href } of footerPolicyLinks) {
      const link = footer.getByRole('link', { name, exact: true })
      await expect(link).toBeVisible()
      await expect(link).toHaveAttribute('href', href)
    }
    await expect(footer.locator('a[href*="free-for-charity-donation-policy"]')).toHaveCount(0)
  })
})
