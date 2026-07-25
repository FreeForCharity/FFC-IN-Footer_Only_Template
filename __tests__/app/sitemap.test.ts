import type { Metadata } from 'next'
import nextConfig from '../../next.config'
import sitemap, { routes } from '../../src/app/sitemap'
import { canonicalPath, siteUrl, trailingSlash } from '../../src/lib/site.config'
import { siteMetadata } from '../../src/lib/siteMetadata'
import { metadata as cookiePolicyMetadata } from '../../src/app/cookie-policy/page'
import { metadata as donationPolicyMetadata } from '../../src/app/donation-policy/page'
import { metadata as ffcDonationPolicyMetadata } from '../../src/app/free-for-charity-donation-policy/page'
import { metadata as privacyPolicyMetadata } from '../../src/app/privacy-policy/page'
import { metadata as securityAcknowledgementsMetadata } from '../../src/app/security-acknowledgements/page'
import { metadata as termsOfServiceMetadata } from '../../src/app/terms-of-service/page'
import { metadata as vulnerabilityDisclosureMetadata } from '../../src/app/vulnerability-disclosure-policy/page'

/** Metadata that owns the canonical tag for each sitemap route. */
const metadataByRoute: Record<string, Metadata> = {
  '/': siteMetadata,
  '/privacy-policy': privacyPolicyMetadata,
  '/cookie-policy': cookiePolicyMetadata,
  '/terms-of-service': termsOfServiceMetadata,
  '/donation-policy': donationPolicyMetadata,
  '/free-for-charity-donation-policy': ffcDonationPolicyMetadata,
  '/vulnerability-disclosure-policy': vulnerabilityDisclosureMetadata,
  '/security-acknowledgements': securityAcknowledgementsMetadata,
}

const originalBasePath = process.env.NEXT_PUBLIC_BASE_PATH

afterEach(() => {
  if (originalBasePath === undefined) {
    delete process.env.NEXT_PUBLIC_BASE_PATH
  } else {
    process.env.NEXT_PUBLIC_BASE_PATH = originalBasePath
  }
})

describe('sitemap.xml generation', () => {
  it('should return a non-empty array', () => {
    const result = sitemap()
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })

  it('should include the home page', () => {
    const result = sitemap()
    const homeEntry = result.find((entry) => entry.url.endsWith('/'))
    expect(homeEntry).toBeDefined()
  })

  it('should use the correct base URL', () => {
    delete process.env.NEXT_PUBLIC_BASE_PATH
    const result = sitemap()
    for (const entry of result) {
      expect(entry.url).toContain('ffcworkingsite1.org')
    }
  })

  it('should include GitHub Pages base path in route URLs when configured', () => {
    process.env.NEXT_PUBLIC_BASE_PATH = '/FFC-IN-Footer_Only_Template'

    const result = sitemap()

    expect(
      result.find((entry) => entry.url.endsWith('/FFC-IN-Footer_Only_Template/'))
    ).toBeDefined()
    expect(
      result.find((entry) => entry.url.includes('/FFC-IN-Footer_Only_Template/privacy-policy'))
    ).toBeDefined()
  })

  it('should have lastModified dates', () => {
    const result = sitemap()
    for (const entry of result) {
      expect(entry.lastModified).toBeDefined()
      expect(entry.lastModified).toBeInstanceOf(Date)
    }
  })

  it('should set home page priority to 1', () => {
    const result = sitemap()
    const homeEntry = result.find((entry) => entry.url.endsWith('/'))
    expect(homeEntry!.priority).toBe(1)
  })
})

/**
 * Regression guard for FFC-Cloudflare-Automation#862.
 *
 * next.config.ts sets `trailingSlash: true`, so the static export serves
 * `/privacy-policy/`, while the sitemap advertised `/privacy-policy`. Every
 * non-root `<loc>` therefore pointed at a non-canonical URL. These tests fail
 * if the sitemap shape and `trailingSlash` ever drift apart again — in either
 * direction, including someone turning `trailingSlash` off.
 */
describe('sitemap URL shape matches the trailingSlash config', () => {
  it('keeps site.config.ts in sync with next.config.ts', () => {
    expect(trailingSlash).toBe(nextConfig.trailingSlash === true)
  })

  it('emits every entry in the shape the export actually serves', () => {
    delete process.env.NEXT_PUBLIC_BASE_PATH

    const result = sitemap()

    expect(result).toHaveLength(routes.length)
    result.forEach((entry, index) => {
      expect(entry.url).toBe(siteUrl(routes[index].path))
      expect(entry.url.endsWith('/')).toBe(trailingSlash)
      // Belt and braces: siteUrl() is what we are asserting about, so also
      // check the raw string against the configured origin + served path.
      expect(entry.url).toBe(`https://ffcworkingsite1.org${canonicalPath(routes[index].path)}`)
    })
  })

  it('keeps the root entry as the bare origin with a single slash', () => {
    delete process.env.NEXT_PUBLIC_BASE_PATH

    const [root] = sitemap()

    expect(root.url).toBe('https://ffcworkingsite1.org/')
    expect(root.url.endsWith('//')).toBe(false)
  })

  it('applies the same shape under the GitHub Pages base path', () => {
    process.env.NEXT_PUBLIC_BASE_PATH = '/FFC-IN-Footer_Only_Template'

    const result = sitemap()
    const urls = result.map((entry) => entry.url)

    expect(urls[0]).toBe('https://ffcworkingsite1.org/FFC-IN-Footer_Only_Template/')
    expect(urls).toContain(
      'https://ffcworkingsite1.org/FFC-IN-Footer_Only_Template/privacy-policy/'
    )
    for (const url of urls) {
      expect(url.endsWith('/')).toBe(trailingSlash)
      expect(url).not.toMatch(/\/\/$/)
    }
  })

  it('never advertises a path that the export does not publish', () => {
    // `/sitemap.xml` and friends are files, not routes: they must not gain a
    // trailing slash even though `trailingSlash` is on.
    expect(canonicalPath('/sitemap.xml')).toBe('/sitemap.xml')
    expect(canonicalPath('/.well-known/security.txt')).toBe('/.well-known/security.txt')
    expect(canonicalPath('/privacy-policy')).toBe('/privacy-policy/')
    expect(canonicalPath('/privacy-policy/')).toBe('/privacy-policy/')
    expect(canonicalPath('/')).toBe('/')
  })

  it('agrees with the canonical tag each page declares', () => {
    delete process.env.NEXT_PUBLIC_BASE_PATH

    for (const route of routes) {
      const metadata = metadataByRoute[route.path]
      expect(metadata).toBeDefined()
      expect(metadata.alternates?.canonical).toBe(siteUrl(route.path))
    }
  })
})
