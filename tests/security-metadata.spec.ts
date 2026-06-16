import { expect, test } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

function payload(body: string): string {
  return body
    .split('\n')
    .filter((line) => !line.startsWith('#') && line.trim() !== '')
    .join('\n')
    .trim()
}

test.describe('security metadata artifacts', () => {
  test('static export contains headers and both security.txt copies', async () => {
    const outDir = join(process.cwd(), 'out')
    const headersPath = join(outDir, '_headers')
    const wellKnownPath = join(outDir, '.well-known/security.txt')
    const rootPath = join(outDir, 'security.txt')

    expect(existsSync(headersPath)).toBe(true)
    expect(existsSync(wellKnownPath)).toBe(true)
    expect(existsSync(rootPath)).toBe(true)

    const headers = readFileSync(headersPath, 'utf8')
    expect(headers).toContain('Content-Security-Policy:')
    expect(headers).toContain('Strict-Transport-Security:')

    expect(payload(readFileSync(rootPath, 'utf8'))).toBe(
      payload(readFileSync(wellKnownPath, 'utf8'))
    )
  })

  test('homepage serves required head security metadata', async ({ page }) => {
    await page.goto('/')

    const csp = page.locator('meta[http-equiv="Content-Security-Policy"]')
    await expect(csp).toHaveAttribute('content', /default-src 'self'/)
    await expect(csp).toHaveAttribute('content', /googletagmanager\.com/)
    await expect(page.locator('meta[name="referrer"]')).toHaveAttribute(
      'content',
      'strict-origin-when-cross-origin'
    )
  })
})
