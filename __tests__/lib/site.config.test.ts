import {
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

describe('siteConfig contract', () => {
  it('exposes the full site identity shape used by runtime consumers', () => {
    expect(siteConfig).toMatchObject({
      name: 'Free For Charity',
      tagline: 'Reduce Costs, Increase Impact',
      url: 'https://ffcworkingsite1.org',
      twitterHandle: '@freeforcharity',
      contactEmail: 'clarkemoyer@freeforcharity.org',
      themeColor: '#ffffff',
      vulnerabilityDisclosurePath: '/vulnerability-disclosure-policy',
    })
    expect(siteConfig.description).toContain('nonprofits')
    expect(siteConfig.shortDescription).toContain('nonprofits')
    expect(siteConfig.keywords).toEqual(
      expect.arrayContaining(['nonprofit', 'charity', 'volunteer'])
    )
    expect(siteConfig.social.map((link) => link.label)).toEqual([
      'Facebook',
      'X (Twitter)',
      'LinkedIn',
      'GitHub',
    ])
    // Converged shape: these keys must match the FFC Single Page template's
    // canonical SiteConfig (guidestar.profileUrl / directProfileUrl,
    // phone.display / phone.tel, addresses[].mapUrl, supportedBy.hubUrl).
    expect(siteConfig.guidestar.profileUrl).toBe('https://www.guidestar.org/profile/46-2471893')
    expect(siteConfig.guidestar.directProfileUrl).toBe(
      'https://www.guidestar.org/profile/shared/bbbe173a-87b9-4af9-a8a2-cae255a95742'
    )
    expect(siteConfig.ein).toBe('46-2471893')
    expect(siteConfig.phone).toEqual({
      display: '(520) 222-8104',
      tel: '5202228104',
    })
    expect(siteConfig.addresses.map((address) => address.label)).toEqual([
      'Main Address',
      'PA Office Address',
    ])
    for (const address of siteConfig.addresses) {
      expect(address.mapUrl).toMatch(/^https:\/\/www\.google\.com\/maps\//)
    }
    // Permanent "Supported by" footer attribution (FFC footer standard) — the
    // values are intentionally FFC's and must survive template customization.
    expect(siteConfig.supportedBy).toEqual({
      name: 'Free For Charity',
      url: 'https://freeforcharity.org',
      hubUrl: 'https://freeforcharity.org/hub/',
    })
    // Standalone charity by default: no "a project of" parent organization.
    expect(siteConfig.parentOrg).toBeUndefined()
  })

  it('builds same-origin absolute site URLs', () => {
    delete process.env.NEXT_PUBLIC_BASE_PATH
    expect(sitePath('/')).toBe('/')
    expect(sitePath('/privacy-policy')).toBe('/privacy-policy')
    expect(siteUrl('/')).toBe('https://ffcworkingsite1.org/')
    expect(siteUrl('/privacy-policy')).toBe('https://ffcworkingsite1.org/privacy-policy')
    expect(() => siteUrl('privacy-policy')).toThrow(TypeError)
    expect(() => siteUrl('//example.com')).toThrow(TypeError)
  })

  it('builds same-origin URLs that include the GitHub Pages base path', () => {
    process.env.NEXT_PUBLIC_BASE_PATH = '/FFC-IN-Footer_Only_Template'

    expect(sitePath('/')).toBe('/FFC-IN-Footer_Only_Template/')
    expect(sitePath('/privacy-policy')).toBe('/FFC-IN-Footer_Only_Template/privacy-policy')
    expect(siteUrl('/')).toBe('https://ffcworkingsite1.org/FFC-IN-Footer_Only_Template/')
    expect(siteUrl('/privacy-policy')).toBe(
      'https://ffcworkingsite1.org/FFC-IN-Footer_Only_Template/privacy-policy'
    )
  })

  it('normalizes card metadata helpers', () => {
    expect(twitterSite()).toBe('@freeforcharity')
    expect(cardDescription()).toBe(siteConfig.shortDescription)
  })
})
