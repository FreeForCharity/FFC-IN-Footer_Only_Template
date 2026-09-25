import {
  canonicalPath,
  cardDescription,
  siteConfig,
  sitePath,
  siteUrl,
  twitterSite,
} from '../../src/lib/site.config'

const originalBasePath = process.env.NEXT_PUBLIC_BASE_PATH

afterEach(() => {
  if (originalBasePath === undefined) {
    delete process.env.NEXT_PUBLIC_BASE_PATH
  } else {
    process.env.NEXT_PUBLIC_BASE_PATH = originalBasePath
  }
})

// An arbitrary base path. It is deliberately NOT this repo's own project path:
// these cases set NEXT_PUBLIC_BASE_PATH themselves, so the value only has to be
// a syntactically valid base path. Naming the real one here would make the test
// look rebrand-sensitive when it is not.
const TEST_BASE_PATH = '/Example-Project-Path'

describe('siteConfig contract', () => {
  // This suite asserts the SHAPE and INVARIANTS every FFC-supported site must
  // satisfy, never this particular charity's identity. A rebrand (the documented
  // purpose of src/lib/site.config.ts) must not turn these red — that is exactly
  // the failure mode `npm run check:rebrand` exists to encourage, and a test
  // suite that contradicts it makes a correct rebrand indistinguishable from a
  // broken one.
  it('exposes the full site identity shape used by runtime consumers', () => {
    for (const key of ['name', 'tagline', 'mission', 'description', 'shortDescription'] as const) {
      expect(typeof siteConfig[key]).toBe('string')
      expect(siteConfig[key].trim().length).toBeGreaterThan(0)
    }

    // Bare https origin: no trailing slash, no path. The GitHub Pages base path
    // is applied separately by sitePath(), so baking one in here double-applies it.
    expect(siteConfig.url).toMatch(/^https:\/\/[^/]+$/)

    // Empty omits the twitter:site meta entirely; anything else carries the @.
    expect(siteConfig.twitterHandle === '' || siteConfig.twitterHandle.startsWith('@')).toBe(true)

    expect(siteConfig.contactEmail).toMatch(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)
    expect(siteConfig.themeColor).toMatch(/^#[0-9a-fA-F]{6}$/)
    expect(siteConfig.vulnerabilityDisclosurePath).toMatch(/^\//)

    expect(siteConfig.keywords.length).toBeGreaterThan(0)
    for (const keyword of siteConfig.keywords) {
      expect(keyword.trim().length).toBeGreaterThan(0)
    }

    // Empty falls back to emailing the charity; anything else must be https.
    for (const url of [siteConfig.donationUrl, siteConfig.volunteerUrl]) {
      if (url !== '') expect(url).toMatch(/^https:\/\//)
    }

    for (const link of siteConfig.social) {
      expect(link.label.trim().length).toBeGreaterThan(0)
      // An empty href disables the link; anything else must be a real https URL.
      if (link.href !== '') expect(link.href).toMatch(/^https:\/\//)
    }

    // Converged shape: these keys must match the FFC Single Page template's
    // canonical SiteConfig (guidestar.profileUrl / directProfileUrl,
    // phone.display / phone.tel, addresses[].mapUrl, supportedBy.hubUrl).
    expect(siteConfig.guidestar.profileUrl).toMatch(/^https:\/\//)
    expect(siteConfig.guidestar.directProfileUrl).toMatch(/^https:\/\//)

    // IRS EIN format: two digits, hyphen, seven digits.
    expect(siteConfig.ein).toMatch(/^\d{2}-\d{7}$/)

    expect(typeof siteConfig.phone.display).toBe('string')
    expect(typeof siteConfig.phone.tel).toBe('string')

    expect(siteConfig.addresses.length).toBeGreaterThan(0)
    for (const address of siteConfig.addresses) {
      expect(address.label.trim().length).toBeGreaterThan(0)
      expect(address.lines.length).toBeGreaterThan(0)
      expect(address.mapUrl).toMatch(/^https:\/\/www\.google\.com\/maps\//)
    }

    // Permanent "Supported by" footer attribution (FFC footer standard). Unlike
    // everything above, these values are intentionally Free For Charity's own
    // and are asserted literally: the standard REQUIRES that a fork neither
    // removes nor repoints them, so a rebrand that changes them is a defect.
    expect(siteConfig.supportedBy).toEqual({
      name: 'Free For Charity',
      url: 'https://freeforcharity.org',
      hubUrl: 'https://freeforcharity.org/hub/',
    })

    // parentOrg is optional — set only for a genuine "a project of" relationship.
    if (siteConfig.parentOrg !== undefined) {
      expect(siteConfig.parentOrg.name.trim().length).toBeGreaterThan(0)
      expect(siteConfig.parentOrg.url).toMatch(/^https:\/\//)
      expect(siteConfig.parentOrg.hubUrl).toMatch(/^https:\/\//)
    }
  })

  it('builds same-origin absolute site URLs in the served (canonical) shape', () => {
    delete process.env.NEXT_PUBLIC_BASE_PATH
    // sitePath() is basePath-only and deliberately slash-agnostic.
    expect(sitePath('/')).toBe('/')
    expect(sitePath('/privacy-policy')).toBe('/privacy-policy')
    // canonicalPath() owns the trailingSlash policy; siteUrl() applies both.
    expect(canonicalPath('/')).toBe('/')
    expect(canonicalPath('/privacy-policy')).toBe('/privacy-policy/')
    expect(siteUrl('/')).toBe(`${siteConfig.url}/`)
    expect(siteUrl('/privacy-policy')).toBe(`${siteConfig.url}/privacy-policy/`)
    // Files are served verbatim and must not gain a slash.
    expect(siteUrl('/sitemap.xml')).toBe(`${siteConfig.url}/sitemap.xml`)
    expect(() => siteUrl('privacy-policy')).toThrow(TypeError)
    expect(() => siteUrl('//example.com')).toThrow(TypeError)
    expect(() => canonicalPath('//example.com')).toThrow(TypeError)
  })

  it('builds same-origin URLs that include the GitHub Pages base path', () => {
    process.env.NEXT_PUBLIC_BASE_PATH = TEST_BASE_PATH

    expect(sitePath('/')).toBe(`${TEST_BASE_PATH}/`)
    expect(sitePath('/privacy-policy')).toBe(`${TEST_BASE_PATH}/privacy-policy`)
    expect(siteUrl('/')).toBe(`${siteConfig.url}${TEST_BASE_PATH}/`)
    expect(siteUrl('/privacy-policy')).toBe(`${siteConfig.url}${TEST_BASE_PATH}/privacy-policy/`)
    expect(siteUrl('/sitemap.xml')).toBe(`${siteConfig.url}${TEST_BASE_PATH}/sitemap.xml`)
  })

  it('normalizes card metadata helpers', () => {
    // Exercise both branches rather than whichever one this fork happens to be
    // configured for: a site with no handle would otherwise leave the
    // normalization path (which is where the @-doubling bug lives) untested.
    const originalHandle = siteConfig.twitterHandle
    try {
      siteConfig.twitterHandle = 'examplecharity'
      expect(twitterSite()).toBe('@examplecharity')

      siteConfig.twitterHandle = '@examplecharity'
      expect(twitterSite()).toBe('@examplecharity')

      // A doubled @ is a typo, not a second handle.
      siteConfig.twitterHandle = '@@examplecharity'
      expect(twitterSite()).toBe('@examplecharity')

      // Empty (or whitespace-only) omits the twitter:site meta entirely.
      siteConfig.twitterHandle = ''
      expect(twitterSite()).toBeUndefined()

      siteConfig.twitterHandle = '   '
      expect(twitterSite()).toBeUndefined()
    } finally {
      siteConfig.twitterHandle = originalHandle
    }

    expect(cardDescription()).toBe(siteConfig.shortDescription.trim() || siteConfig.description)
    expect(cardDescription().trim().length).toBeGreaterThan(0)
  })
})
