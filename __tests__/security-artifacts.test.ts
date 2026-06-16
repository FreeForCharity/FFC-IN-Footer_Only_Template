import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { siteConfig } from '../src/lib/site.config'

const root = process.cwd()

function readFixture(path: string): string {
  return readFileSync(join(root, path), 'utf8')
}

function payload(body: string): string {
  return body
    .split('\n')
    .filter((line) => !line.startsWith('#') && line.trim() !== '')
    .join('\n')
    .trim()
}

describe('deployable security artifacts', () => {
  it('ships host-readable security headers with a footer-only CSP', () => {
    expect(existsSync(join(root, 'public/_headers'))).toBe(true)

    const headers = readFixture('public/_headers')
    expect(headers).toContain('X-Frame-Options: SAMEORIGIN')
    expect(headers).toContain('X-Content-Type-Options: nosniff')
    expect(headers).toContain('Referrer-Policy: strict-origin-when-cross-origin')
    expect(headers).toContain('Strict-Transport-Security: max-age=63072000; includeSubDomains')
    expect(headers).toContain("Content-Security-Policy: default-src 'self'")
    expect(headers).toContain('https://www.googletagmanager.com')
    expect(headers).toContain('https://www.google-analytics.com')
    expect(headers).toContain('https://connect.facebook.net')
    expect(headers).toContain('https://www.clarity.ms')
    expect(headers).not.toContain('widgets.sociablekit.com')
    expect(headers).not.toContain('www.youtube.com')
  })

  it('publishes matching RFC 9116 security.txt payloads at root and well-known paths', () => {
    expect(existsSync(join(root, 'public/.well-known/security.txt'))).toBe(true)
    expect(existsSync(join(root, 'public/security.txt'))).toBe(true)

    const wellKnown = readFixture('public/.well-known/security.txt')
    const rootCopy = readFixture('public/security.txt')
    const wellKnownPayload = payload(wellKnown)

    expect(payload(rootCopy)).toBe(wellKnownPayload)
    expect(wellKnownPayload).toContain(`Contact: mailto:${siteConfig.contactEmail}`)
    expect(wellKnownPayload).toContain('Preferred-Languages: en')
    expect(wellKnownPayload).toContain(`Canonical: ${siteConfig.url}/.well-known/security.txt`)
    expect(wellKnownPayload).toContain(`Canonical: ${siteConfig.url}/security.txt`)
    expect(wellKnownPayload).toContain(
      `Canonical: ${siteConfig.url}/FFC-IN-Footer_Only_Template/.well-known/security.txt`
    )
    expect(wellKnownPayload).toContain(
      `Canonical: ${siteConfig.url}/FFC-IN-Footer_Only_Template/security.txt`
    )
    expect(wellKnownPayload).toContain(
      `Policy: ${siteConfig.url}${siteConfig.vulnerabilityDisclosurePath}`
    )
    expect(wellKnownPayload).toContain(
      `Policy: ${siteConfig.url}/FFC-IN-Footer_Only_Template${siteConfig.vulnerabilityDisclosurePath}`
    )
    expect(wellKnownPayload).toContain(
      `Acknowledgments: ${siteConfig.url}/security-acknowledgements`
    )
    expect(wellKnownPayload).toContain(
      `Acknowledgments: ${siteConfig.url}/FFC-IN-Footer_Only_Template/security-acknowledgements`
    )

    const expires = wellKnownPayload.match(/^Expires:\s*(.+)$/m)?.[1]
    expect(expires).toBeDefined()
    expect(new Date(expires as string).getTime()).toBeGreaterThan(Date.now())
  })

  it('defines a least-privilege expiry workflow for security.txt maintenance', () => {
    const workflow = readFixture('.github/workflows/security-txt-expiry.yml')

    expect(workflow).toContain('workflow_dispatch:')
    expect(workflow).toContain("cron: '0 12 * * 1'")
    expect(workflow).toContain('contents: read')
    expect(workflow).toContain('issues: write')
    expect(workflow).toContain('ffc-security-txt:missing')
    expect(workflow).toContain('ffc-security-txt:no-expires')
    expect(workflow).toContain('ffc-security-txt:invalid-expires')
    expect(workflow).toContain('ffc-security-txt:expiring-soon')
    expect(workflow).toContain('github.rest.issues.listForRepo')
    expect(workflow).toContain('github.rest.issues.create')
    expect(workflow).not.toContain('secrets.')
  })
})
