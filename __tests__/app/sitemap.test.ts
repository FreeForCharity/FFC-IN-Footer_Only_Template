import type { Metadata } from 'next'
import nextConfig from '../../next.config'
import sitemap, { routes } from '../../src/app/sitemap'
import { canonicalPath, siteConfig, siteUrl, trailingSlash } from '../../src/lib/site.config'
import { siteMetadata } from '../../src/lib/siteMetadata'
import { metadata as cookiePolicyMetadata } from '../../src/app/cookie-policy/page'
import { metadata as donationPolicyMetadata } from '../../src/app/donation-policy/page'
import { metadata as ffcDonationPolicyMetadata } from '../../src/app/free-for-charity-donation-policy/page'
import { metadata as privacyPolicyMetadata } from '../../src/app/privacy-policy/page'
import { metadata as securityAcknowledgementsMetadata } from '../../src/app/security-acknowledgements/page'
import { metadata as termsOfServiceMetadata } from '../../src/app/terms-of-service/page'
import { metadata as vulnerabilityDisclosureMetadata } from '../../src/app/vulnerability-disclosure-policy/page'

// An arbitrary base path: these cases set NEXT_PUBLIC_BASE_PATH themselves, so
// the value need only be a valid base path, not this repo's own project path.
const TEST_BASE_PATH = '/Example-Project-Path'

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
      expect(entry.url.startsWith(`${siteConfig.url}/`)).toBe(true)
    }
  })

  it('should include GitHub Pages base path in route URLs when configured', () => {
    process.env.NEXT_PUBLIC_BASE_PATH = TEST_BASE_PATH

    const result = sitemap()

    expect(result.find((entry) => entry.url.endsWith(`${TEST_BASE_PATH}/`))).toBeDefined()
    expect(
      result.find((entry) => entry.url.includes(`${TEST_BASE_PATH}/privacy-policy`))
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
      // Compare against canonicalPath rather than asserting endsWith('/') === trailingSlash.
      // The root entry ends with '/' in BOTH modes, so the direct comparison fails on '/' the
      // moment trailingSlash is turned off — a test that breaks on a valid config change is a
      // test people delete rather than trust.
      expect(entry.url.endsWith('/')).toBe(canonicalPath(routes[index].path).endsWith('/'))
      // Belt and braces: siteUrl() is what we are asserting about, so also
      // check the raw string against the configured origin + served path.
      expect(entry.url).toBe(`${siteConfig.url}${canonicalPath(routes[index].path)}`)
    })
  })

  it('keeps the root entry as the bare origin with a single slash', () => {
    delete process.env.NEXT_PUBLIC_BASE_PATH

    const [root] = sitemap()

    expect(root.url).toBe(`${siteConfig.url}/`)
    expect(root.url.endsWith('//')).toBe(false)
  })

  it('applies the same shape under the GitHub Pages base path', () => {
    process.env.NEXT_PUBLIC_BASE_PATH = TEST_BASE_PATH

    const result = sitemap()
    const urls = result.map((entry) => entry.url)

    expect(urls[0]).toBe(`${siteConfig.url}${TEST_BASE_PATH}/`)
    expect(urls).toContain(`${siteConfig.url}${TEST_BASE_PATH}/privacy-policy/`)
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

/**
 * The root layout sets `title.template = '%s | <site name>'`, which Next applies
 * to every CHILD route segment (not to app/page.tsx, which shares the root
 * segment with the layout and uses `title.default`).
 *
 * A child page whose own title already ends in the site name therefore renders
 * it twice — `Privacy Policy | Acme | Acme`. That shipped in the template for
 * every policy page and was invisible to the suite, because the old assertion
 * was `title` CONTAINS the site name, which the doubled form satisfies.
 */
describe('page titles compose with the layout template without repeating the site name', () => {
  const template = (siteMetadata.title as { template: string }).template

  it('uses a template that appends the site name exactly once', () => {
    expect(template).toContain('%s')
    expect(template.split(siteConfig.name)).toHaveLength(2)
  })

  it.each(routes.filter((route) => route.path !== '/'))(
    'composes a single site name suffix for $path',
    (route) => {
      const metadata = metadataByRoute[route.path]
      const pageTitle = metadata.title as string

      expect(typeof pageTitle).toBe('string')
      expect(pageTitle.length).toBeGreaterThan(0)

      // The page must not already carry the suffix the template appends.
      // Deliberately NOT "the site name appears exactly once in the composed
      // title": a page name may legitimately contain the org name — the FFC
      // donation policy page is called "Free For Charity Donation Policy", and
      // on FFC's own deployment siteConfig.name is "Free For Charity", so the
      // correct title carries it twice. What is always wrong is the page
      // repeating the trailing "| <site name>" the layout adds.
      const suffix = `| ${siteConfig.name}`
      expect(pageTitle.trimEnd().endsWith(suffix)).toBe(false)

      const rendered = template.replace('%s', pageTitle)
      expect(rendered.trimEnd().endsWith(suffix)).toBe(true)
      // ...and only once at the end.
      expect(rendered.trimEnd().slice(0, -suffix.length).endsWith(suffix)).toBe(false)
    }
  )

  it('gives the root route a complete standalone title', () => {
    // app/page.tsx shares the root segment with the layout, so the template does
    // NOT apply to it. This template's root page declares no metadata of its
    // own and inherits `title.default`, which must therefore be complete.
    const defaultTitle = (siteMetadata.title as { default: string }).default

    expect(defaultTitle).toContain(siteConfig.name)
    expect(defaultTitle.split(siteConfig.name)).toHaveLength(2)
  })
})
