import { test, expect } from '@playwright/test'

/**
 * Footer-Only Template Smoke Tests
 *
 * This repo intentionally renders only:
 * - Team section
 * - Footer
 */

test.describe('Footer-only template', () => {
  test('should render the Team section with 5 members', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { name: 'The Free For Charity Team' })).toBeVisible()

    const memberPhotos = page.locator('#team img[alt]:not([alt="linkedin icon"])')
    await expect(memberPhotos).toHaveCount(5)

    // Ensure each member image is present and points at the local asset path.
    // (In CI we build without basePath; deploy build rewrites via NEXT_PUBLIC_BASE_PATH.)
    for (const member of [
      'Clarke Moyer',
      'Chris Rae',
      'Tyler Carlotto',
      'Brennan Darling',
      'Rebecca Cook',
    ]) {
      const img = page.locator(`#team img[alt="${member}"]`).first()
      await expect(img).toBeVisible()
      await expect(img).toHaveAttribute('src', /\/Images\/member\d+\.webp/)
    }
  })

  test('should render the Footer', async ({ page }) => {
    await page.goto('/')

    await expect(page.locator('footer')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Quick Links' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Contact Us' })).toBeVisible()
  })
})
