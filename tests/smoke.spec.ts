import { test, expect } from '@playwright/test'
import { testConfig } from './test.config'

/**
 * Post-Deploy Smoke Tests
 *
 * A comprehensive test suite that verifies all critical features are working
 * after deployment. Designed to run against any URL:
 *
 *   BASE_URL=https://example.com npx playwright test --config=playwright.smoke.config.ts
 *
 * Covers: page loads, footer, policy links, social links, copyright,
 * cookie consent, and Google Tag Manager.
 */

/**
 * All pages that must return 200 and render a heading.
 *
 * Paths are RELATIVE (no leading slash) so Playwright appends them to baseURL.
 * This is critical for GitHub Pages where baseURL includes a basePath prefix
 * (e.g., https://freeforcharity.github.io/FFC-IN-Footer_Only_Template/).
 * Absolute paths like '/privacy-policy/' would navigate to the domain root instead.
 *
 * Paths use NO trailing slash — GitHub Pages deploys flat HTML files
 * (privacy-policy.html) via actions/configure-pages, so trailing-slash URLs 404.
 * Locally, serve redirects non-trailing to trailing slash, so both work.
 */
const allPages = [
  { path: './', name: 'Home' },
  { path: 'privacy-policy', name: 'Privacy Policy' },
  { path: 'cookie-policy', name: 'Cookie Policy' },
  { path: 'terms-of-service', name: 'Terms of Service' },
  { path: 'donation-policy', name: 'Donation Policy' },
  { path: 'free-for-charity-donation-policy', name: 'FFC Donation Policy' },
  { path: 'security-acknowledgements', name: 'Security Acknowledgements' },
  { path: 'vulnerability-disclosure-policy', name: 'Vulnerability Disclosure Policy' },
]

/**
 * Footer policy links — use pathSuffix for basePath-agnostic assertions.
 * No trailing slash: GitHub Pages hrefs omit it; toContain matches both
 * "/privacy-policy" and "/privacy-policy/" (local dev with trailingSlash).
 */
const footerPolicyLinks = [
  { name: 'Free For Charity Donation Policy', pathSuffix: '/free-for-charity-donation-policy' },
  { name: 'Free For Charity Privacy Policy', pathSuffix: '/privacy-policy' },
  { name: 'Free For Charity Cookie Policy', pathSuffix: '/cookie-policy' },
  { name: 'Free For Charity Terms of Service', pathSuffix: '/terms-of-service' },
  {
    name: 'Free For Charity Vulnerability Disclosure Policy',
    pathSuffix: '/vulnerability-disclosure-policy',
  },
  {
    name: 'Free For Charity Security Acknowledgement',
    pathSuffix: '/security-acknowledgements',
  },
]

test.describe('Post-deploy smoke tests', () => {
  // Each page gets its own test with a fresh browser context to avoid
  // Next.js client-side routing interference on GitHub Pages static export.
  // (Navigating between pages in the same context causes blank renders.)
  for (const { path, name } of allPages) {
    test(`${name} page returns 200 and renders a heading`, async ({ page }) => {
      const response = await page.goto(path, { waitUntil: 'domcontentloaded' })
      expect(response?.status(), `${name} (${path}) should return 200`).toBe(200)

      const heading = page.locator('h1, h2, h3').first()
      await expect(heading, `${name} should render a heading`).toBeVisible()
    })
  }

  test('footer renders with all sections', async ({ page }) => {
    await page.goto('./')

    const footer = page.locator('footer')
    await expect(footer).toBeVisible()

    // Three column headings
    await expect(footer.getByRole('heading', { name: 'Endorsements' })).toBeVisible()
    await expect(footer.getByRole('heading', { name: 'Quick Links' })).toBeVisible()
    await expect(footer.getByRole('heading', { name: 'Contact Us' })).toBeVisible()

    // Policy section heading
    await expect(footer.getByRole('heading', { name: 'Free For Charity Policy' })).toBeVisible()
  })

  test('footer contains policy links with correct paths', async ({ page }) => {
    await page.goto('./')
    const footer = page.locator('footer')

    for (const { name, pathSuffix } of footerPolicyLinks) {
      const link = footer.getByRole('link', { name })
      await expect(link, `Policy link "${name}" should be visible`).toBeVisible()

      // Use toContain — href may include a basePath prefix on GitHub Pages
      const href = await link.getAttribute('href')
      expect(href, `"${name}" href should contain ${pathSuffix}`).toContain(pathSuffix)
    }
  })

  test('social links and copyright are correct', async ({ page }) => {
    await page.goto('./')
    const footer = page.locator('footer')

    // Verify all 4 social links
    for (const [, social] of Object.entries(testConfig.socialLinks)) {
      const link = footer.locator(`a[href*="${social.url}"]`)
      await expect(link, `Social link for ${social.ariaLabel}`).toBeVisible()
      await expect(link).toHaveAttribute('aria-label', social.ariaLabel)
    }

    // Copyright with current year
    const currentYear = new Date().getFullYear()
    const copyrightText = footer.getByText(testConfig.copyright.searchText)
    await expect(copyrightText).toBeVisible()
    await expect(copyrightText).toContainText(`${currentYear}`)
    await expect(copyrightText).toContainText(testConfig.copyright.text)

    // Organization link in copyright
    const orgLink = footer.getByRole('link', { name: testConfig.copyright.linkText })
    await expect(orgLink).toBeVisible()
    await expect(orgLink).toHaveAttribute('href', testConfig.copyright.linkUrl)
  })

  test('cookie consent banner appears and can be dismissed', async ({ page, context }) => {
    await context.clearCookies()
    await page.goto('./')
    await page.evaluate(() => localStorage.clear())
    await page.reload()

    // Wait for client-side hydration (cookie consent renders after useEffect)
    const banner = page.locator('[role="region"][aria-label="Cookie consent notice"]')
    await expect(banner).toBeVisible({ timeout: 15000 })

    // Verify banner heading and buttons
    const heading = banner.locator('h3')
    await expect(heading).toHaveText(testConfig.cookieConsent.bannerHeading)

    await expect(
      banner.getByRole('button', { name: testConfig.cookieConsent.buttons.acceptAll })
    ).toBeVisible()
    await expect(
      banner.getByRole('button', { name: testConfig.cookieConsent.buttons.declineAll })
    ).toBeVisible()
    await expect(
      banner.getByRole('button', { name: testConfig.cookieConsent.buttons.customize })
    ).toBeVisible()

    // Accept cookies and verify banner dismisses
    await banner.getByRole('button', { name: testConfig.cookieConsent.buttons.acceptAll }).click()
    await expect(banner).not.toBeVisible()
  })

  test('GTM loads and dataLayer is available', async ({ page }) => {
    await page.goto('./')

    // Wait for lazy-loaded GTM script (strategy="lazyOnload")
    await page.waitForFunction(() => document.querySelector('script[id="gtm-script"]') !== null, {
      timeout: 15000,
    })

    // Verify GTM script contains correct ID
    const scriptContent = await page.locator('script[id="gtm-script"]').innerHTML()
    expect(scriptContent).toContain(testConfig.googleTagManager.id)

    // Verify dataLayer is initialized
    await page.waitForFunction(
      () => typeof window.dataLayer !== 'undefined' && Array.isArray(window.dataLayer),
      { timeout: 15000 }
    )

    const hasDataLayer = await page.evaluate(() => {
      return typeof window.dataLayer !== 'undefined' && Array.isArray(window.dataLayer)
    })
    expect(hasDataLayer).toBe(true)

    // Verify GTM noscript fallback exists in HTML
    const pageContent = await page.content()
    expect(pageContent).toContain('googletagmanager.com/ns.html')
  })
})
