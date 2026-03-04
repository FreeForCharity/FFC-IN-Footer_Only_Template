import { test, expect } from '@playwright/test'
import { testConfig } from './test.config'

/**
 * Google Tag Manager (GTM) Tests
 *
 * These tests verify that Google Tag Manager is properly integrated:
 * 1. GTM script is loaded (via Next.js Script lazyOnload strategy)
 * 2. dataLayer is initialized
 * 3. GTM noscript fallback exists in body
 * 4. GTM ID is configured in the component
 *
 * Note: The GTM script uses strategy="lazyOnload", which defers loading until
 * after the browser's onload event. Tests must wait for the script to appear.
 */

/** Helper: wait for the GTM script element to be injected by Next.js */
async function waitForGtmScript(page: import('@playwright/test').Page) {
  await page.waitForFunction(() => document.querySelector('script[id="gtm-script"]') !== null, {
    timeout: 15000,
  })
}

/** Helper: wait for dataLayer to be initialized */
async function waitForDataLayer(page: import('@playwright/test').Page) {
  await page.waitForFunction(
    () => typeof window.dataLayer !== 'undefined' && Array.isArray(window.dataLayer),
    { timeout: 15000 }
  )
}

test.describe('Google Tag Manager Integration', () => {
  test('should initialize dataLayer on page load', async ({ page }) => {
    await page.goto('/')
    await waitForDataLayer(page)

    const hasDataLayer = await page.evaluate(() => {
      return typeof window.dataLayer !== 'undefined' && Array.isArray(window.dataLayer)
    })

    expect(hasDataLayer).toBe(true)
  })

  test('should load GTM script with correct ID', async ({ page }) => {
    await page.goto('/')
    await waitForGtmScript(page)

    const gtmScript = await page.locator('script[id="gtm-script"]').count()
    expect(gtmScript).toBeGreaterThan(0)

    const scriptContent = await page.locator('script[id="gtm-script"]').innerHTML()
    expect(scriptContent).toContain('googletagmanager.com/gtm.js')
    expect(scriptContent).toContain('dataLayer')
  })

  test('should have GTM noscript fallback in body', async ({ page }) => {
    await page.goto('/')

    // The noscript iframe is rendered server-side (not lazy-loaded)
    const pageContent = await page.content()
    expect(pageContent).toContain('googletagmanager.com/ns.html')
    expect(pageContent).toContain('noscript')
  })

  test('should push events to dataLayer', async ({ page }) => {
    await page.goto('/')
    await waitForDataLayer(page)

    const canPushToDataLayer = await page.evaluate(() => {
      if (typeof window.dataLayer === 'undefined') return false

      const initialLength = window.dataLayer.length
      window.dataLayer.push({ event: 'test_event', test: true })
      return window.dataLayer.length > initialLength
    })

    expect(canPushToDataLayer).toBe(true)
  })

  test('should load GTM script after page interaction', async ({ page }) => {
    await page.goto('/')
    await waitForGtmScript(page)

    const gtmScript = await page.evaluate(() => {
      const script = document.querySelector('script[id="gtm-script"]')
      return script !== null
    })

    expect(gtmScript).toBe(true)

    await waitForDataLayer(page)

    const dataLayerInitialized = await page.evaluate(() => {
      return typeof window.dataLayer !== 'undefined'
    })

    expect(dataLayerInitialized).toBe(true)
  })

  test('should work with cookie consent system', async ({ page, context }) => {
    // Clear cookies and localStorage
    await context.clearCookies()
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()

    // Wait for cookie banner (client-side hydration)
    const banner = page.locator('[role="region"][aria-label="Cookie consent notice"]')
    await expect(banner).toBeVisible({ timeout: 15000 })

    // Accept all cookies
    await page.getByRole('button', { name: 'Accept All' }).click()

    // Wait for dataLayer to be available (consent_update event is pushed synchronously)
    await waitForDataLayer(page)

    const hasConsentEvent = await page.evaluate(() => {
      if (typeof window.dataLayer === 'undefined') return false

      return window.dataLayer.some((item: { event?: string }) => item.event === 'consent_update')
    })

    expect(hasConsentEvent).toBe(true)
  })
})

test.describe('Google Tag Manager Configuration', () => {
  test('should load GTM script with configured ID', async ({ page }) => {
    await page.goto('/')
    await waitForGtmScript(page)

    const gtmScript = await page.locator('script[id="gtm-script"]').count()
    expect(gtmScript).toBeGreaterThan(0)

    const scriptContent = await page.locator('script[id="gtm-script"]').innerHTML()
    expect(scriptContent).toContain(testConfig.googleTagManager.id)
  })
})
