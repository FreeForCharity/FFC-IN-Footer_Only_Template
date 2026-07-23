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

    // Cards render an initials monogram, not a photo — there are no team images.
    const memberPhotos = page.locator('#team img')
    await expect(memberPhotos).toHaveCount(0)

    // Each member renders a name heading; when a safe LinkedIn URL is present the
    // whole card links to it (new tab).
    for (const member of [
      'Clarke Moyer',
      'Chris Rae',
      'Tyler Carlotto',
      'Brennan Darling',
      'Rebecca Cook',
    ]) {
      await expect(page.getByRole('heading', { level: 3, name: member })).toBeVisible()
      await expect(page.getByRole('link', { name: `${member} on LinkedIn` })).toBeVisible()
    }
  })

  test('should render the Footer', async ({ page }) => {
    await page.goto('/')

    await expect(page.locator('footer')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Quick Links' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Contact Us' })).toBeVisible()
  })
})
