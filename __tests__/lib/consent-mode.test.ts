import {
  CONSENT_WAIT_FOR_UPDATE_MS,
  CONSENT_MODE_BOOTSTRAP,
  isConfigured,
  updateGoogleConsent,
} from '../../src/lib/consent-mode'

describe('CONSENT_MODE_BOOTSTRAP', () => {
  it('denies storage in a SINGLE unscoped default call', () => {
    const defaultCalls = CONSENT_MODE_BOOTSTRAP.split("gtag('consent', 'default'").length - 1
    expect(defaultCalls).toBe(1)
    expect(CONSENT_MODE_BOOTSTRAP).toContain("'analytics_storage': 'denied'")
  })

  it('grants storage to nobody by default, in any region', () => {
    // Asserted as an absence: reinstating a permissive default is a
    // one-line edit that every presence-only assertion would still pass.
    expect(CONSENT_MODE_BOOTSTRAP).not.toContain("'analytics_storage': 'granted'")
    expect(CONSENT_MODE_BOOTSTRAP).not.toContain("'ad_storage': 'granted'")
    expect(CONSENT_MODE_BOOTSTRAP).not.toContain("'region'")
  })

  it('denies every ad signal, not just analytics', () => {
    for (const signal of ['ad_storage', 'ad_user_data', 'ad_personalization']) {
      expect(CONSENT_MODE_BOOTSTRAP).toContain(`'${signal}': 'denied'`)
    }
    expect(CONSENT_MODE_BOOTSTRAP).toContain("'functionality_storage': 'granted'")
    expect(CONSENT_MODE_BOOTSTRAP).toContain("'security_storage': 'granted'")
  })

  it('holds tags with wait_for_update on the one default call', () => {
    expect(CONSENT_WAIT_FOR_UPDATE_MS).toBe(500)
    const occurrences =
      CONSENT_MODE_BOOTSTRAP.split(`'wait_for_update': ${CONSENT_WAIT_FOR_UPDATE_MS}`).length - 1
    expect(occurrences).toBe(1)
  })
  it('keeps click ids and redacts ad identifiers while consent is denied', () => {
    expect(CONSENT_MODE_BOOTSTRAP).toContain("gtag('set', 'url_passthrough', true)")
    expect(CONSENT_MODE_BOOTSTRAP).toContain("gtag('set', 'ads_data_redaction', true)")
  })

  it('defines gtag as a function declaration so it lands on window', () => {
    expect(CONSENT_MODE_BOOTSTRAP).toContain('function gtag(){dataLayer.push(arguments);}')
  })
})

describe('isConfigured', () => {
  it('treats the shipped placeholders as not configured', () => {
    expect(isConfigured('G-XXXXXXXXXX')).toBe(false) // GA4 measurement id
    expect(isConfigured('XXXXXXXXXXXXXXX')).toBe(false) // Meta Pixel id
    expect(isConfigured('XXXXXXXXXX')).toBe(false) // Clarity project id
  })

  it('treats falsy values as not configured', () => {
    expect(isConfigured('')).toBe(false)
    expect(isConfigured(undefined)).toBe(false)
    expect(isConfigured(null)).toBe(false)
  })

  it('trims before testing, so whitespace cannot smuggle a value past the guard', () => {
    expect(isConfigured('   ')).toBe(false)
    expect(isConfigured('\t\n')).toBe(false)
    expect(isConfigured(' G-XXXXXXXXXX ')).toBe(false)
    expect(isConfigured(' G-ABC123DEF4 ')).toBe(true)
  })

  it('treats real ids as configured', () => {
    expect(isConfigured('G-ABC123DEF4')).toBe(true)
    expect(isConfigured('123456789012345')).toBe(true)
    expect(isConfigured('abcdefghij')).toBe(true)
  })
})

describe('updateGoogleConsent', () => {
  afterEach(() => {
    delete window.gtag
  })

  it('does nothing when gtag is not on window', () => {
    delete window.gtag
    expect(() =>
      updateGoogleConsent({ necessary: true, functional: true, analytics: true, marketing: true })
    ).not.toThrow()
  })

  it('maps analytics to analytics_storage and marketing to the ad signals', () => {
    const gtag = jest.fn()
    window.gtag = gtag

    updateGoogleConsent({ necessary: true, functional: true, analytics: true, marketing: false })

    expect(gtag).toHaveBeenCalledWith('consent', 'update', {
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      personalization_storage: 'denied',
      functionality_storage: 'granted',
      security_storage: 'granted',
    })
  })

  it('denies analytics_storage on decline while keeping security granted', () => {
    const gtag = jest.fn()
    window.gtag = gtag

    updateGoogleConsent({ necessary: true, functional: true, analytics: false, marketing: false })

    expect(gtag).toHaveBeenCalledWith(
      'consent',
      'update',
      expect.objectContaining({
        analytics_storage: 'denied',
        ad_storage: 'denied',
        security_storage: 'granted',
      })
    )
  })

  it('grants everything on a full accept', () => {
    const gtag = jest.fn()
    window.gtag = gtag

    updateGoogleConsent({ necessary: true, functional: true, analytics: true, marketing: true })

    expect(gtag).toHaveBeenCalledWith('consent', 'update', {
      analytics_storage: 'granted',
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
      personalization_storage: 'granted',
      functionality_storage: 'granted',
      security_storage: 'granted',
    })
  })
})
