import {
  PENDING_TEXT,
  canonicalPath,
  cardDescription,
  isPending,
  type PendingField,
  mailtoHref,
  siteConfig,
  sitePath,
  siteUrl,
  twitterSite,
} from '../../src/lib/site.config'
import { team } from '../../src/data/team'

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

// IRS EIN format (two digits, hyphen, seven digits), or empty while the EIN is
// pending (see the pending contract below).
const einPattern = (): RegExp => (isPending('ein') ? /^$/ : /^\d{2}-\d{7}$/)

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

    // A pending email is empty (see the pending contract below).
    expect(siteConfig.contactEmail).toMatch(
      isPending('email') ? /^$/ : /^[^@\s]+@[^@\s]+\.[^@\s]+$/
    )
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
    // Empty = no GuideStar / Candid profile yet (the footer hides that element).
    for (const url of [siteConfig.guidestar.profileUrl, siteConfig.guidestar.directProfileUrl]) {
      expect(url).toMatch(/^(https:\/\/\S+)?$/)
    }

    expect(siteConfig.ein).toMatch(einPattern())

    expect(typeof siteConfig.phone.display).toBe('string')
    expect(typeof siteConfig.phone.tel).toBe('string')

    // A pending address has no entries (see the pending contract below).
    if (!isPending('address')) expect(siteConfig.addresses.length).toBeGreaterThan(0)
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

describe('siteConfig.pending contract', () => {
  // Every PendingField, mapped to "its value is empty". A pending field must
  // carry no value, so no placeholder or borrowed (template/FFC) value can
  // ship behind the "awaiting information" notice. The Record type makes this
  // map fail to compile if PendingField grows a member it does not cover.
  const isEmpty: Record<PendingField, () => boolean> = {
    email: () => siteConfig.contactEmail.trim() === '',
    phone: () => siteConfig.phone.display.trim() === '' && siteConfig.phone.tel.trim() === '',
    address: () => siteConfig.addresses.length === 0,
    ein: () => siteConfig.ein.trim() === '',
    guidestar: () =>
      siteConfig.guidestar.profileUrl.trim() === '' &&
      siteConfig.guidestar.directProfileUrl.trim() === '',
    social: () => siteConfig.social.every((s) => s.href.trim() === ''),
    team: () => team.length === 0,
    donationUrl: () => siteConfig.donationUrl.trim() === '',
    volunteerUrl: () => siteConfig.volunteerUrl.trim() === '',
  }
  const knownFields = Object.keys(isEmpty)

  /** Pending fields that are unknown, duplicated, or still carry a value. */
  function pendingViolations(): string[] {
    const pending = siteConfig.pending ?? []
    const problems: string[] = []
    pending.forEach((field, index) => {
      if (!knownFields.includes(field)) problems.push(`${field}: unknown field`)
      else if (pending.indexOf(field) !== index) problems.push(`${field}: listed twice`)
      else if (!isEmpty[field]()) problems.push(`${field}: pending but has a value`)
    })
    return problems
  }

  // This site's own config: whatever it lists must satisfy the contract.
  it('holds for the shipped config', () => {
    expect(pendingViolations()).toEqual([])
    for (const field of siteConfig.pending ?? []) expect(isPending(field)).toBe(true)
  })

  it('has a fixed, non-empty placeholder text', () => {
    expect(PENDING_TEXT).toBe('Awaiting information from the charity')
  })

  // The template itself lists nothing pending, so the fork-style states are
  // exercised by varying the config here (as the footer's phone tests do)
  // rather than depending on whichever state this site happens to ship in.
  describe('with a fork-style pending list', () => {
    const original = {
      contactEmail: siteConfig.contactEmail,
      phone: siteConfig.phone,
      addresses: siteConfig.addresses,
      ein: siteConfig.ein,
      guidestar: siteConfig.guidestar,
      social: siteConfig.social,
      donationUrl: siteConfig.donationUrl,
      volunteerUrl: siteConfig.volunteerUrl,
      pending: siteConfig.pending,
    }
    afterEach(() => {
      Object.assign(siteConfig, original)
    })

    it('isPending reflects exactly the listed fields', () => {
      siteConfig.pending = undefined
      for (const field of knownFields) expect(isPending(field as PendingField)).toBe(false)

      siteConfig.pending = ['phone', 'guidestar']
      expect(isPending('phone')).toBe(true)
      expect(isPending('guidestar')).toBe(true)
      expect(isPending('email')).toBe(false)
    })

    it('accepts every footer field pending with an empty value', () => {
      siteConfig.contactEmail = ''
      siteConfig.phone = { display: '', tel: '' }
      siteConfig.addresses = []
      siteConfig.ein = ''
      siteConfig.guidestar = { profileUrl: '', directProfileUrl: '' }
      siteConfig.social = [{ label: 'Facebook', href: '' }]
      siteConfig.donationUrl = ''
      siteConfig.volunteerUrl = ''
      // 'team' is left out: its value is the roster in src/data/team, which the
      // template populates (the empty-roster case is covered by the team
      // section's own tests).
      siteConfig.pending = knownFields.filter((f) => f !== 'team') as PendingField[]

      expect(pendingViolations()).toEqual([])
    })

    it('rejects a pending field that still carries a value', () => {
      // An EIN that is set, listed as pending, is a violation. So is a roster
      // that is populated; this site may ship with its roster pending (empty),
      // so 'team' is only asserted when there is a roster to carry a value.
      const hasRoster = team.length > 0
      siteConfig.ein = '12-3456789'
      siteConfig.pending = hasRoster ? ['ein', 'team'] : ['ein']
      expect(pendingViolations()).toEqual([
        'ein: pending but has a value',
        ...(hasRoster ? ['team: pending but has a value'] : []),
      ])
    })

    it('rejects an unknown or duplicated field', () => {
      siteConfig.ein = ''
      siteConfig.pending = ['ein', 'ein', 'taxStatusLabel' as PendingField]
      expect(pendingViolations()).toEqual(['ein: listed twice', 'taxStatusLabel: unknown field'])
    })

    it('relaxes the EIN format check only while the EIN is pending', () => {
      siteConfig.ein = ''
      siteConfig.pending = ['ein']
      expect(siteConfig.ein).toMatch(einPattern())

      siteConfig.pending = []
      expect(siteConfig.ein).not.toMatch(einPattern())
    })
  })
})

describe('mailtoHref', () => {
  const original = siteConfig.contactEmail
  afterEach(() => {
    siteConfig.contactEmail = original
  })

  it('encodes characters that would add a recipient or a header', () => {
    siteConfig.contactEmail = 'a@b.example,c@d.example?bcc=e@f.example'
    expect(mailtoHref()).toBe('mailto:a@b.example%2Cc@d.example%3Fbcc=e@f.example')
  })

  it('removes whitespace inside the address instead of encoding it', () => {
    siteConfig.contactEmail = ' hello @pantry.\nexample '
    expect(mailtoHref()).toBe('mailto:hello@pantry.example')
  })

  it('appends an encoded subject', () => {
    siteConfig.contactEmail = 'hello@pantry.example'
    expect(mailtoHref('Hi & bye')).toBe('mailto:hello@pantry.example?subject=Hi%20%26%20bye')
  })
})
