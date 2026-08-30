import {
  EU_CONSENT_REGIONS,
  CONSENT_WAIT_FOR_UPDATE_MS,
  CONSENT_MODE_BOOTSTRAP,
  isConfigured,
  updateGoogleConsent,
} from '../../src/lib/consent-mode'

describe('EU_CONSENT_REGIONS', () => {
  it('contains exactly the 32 codes Google’s EU User Consent Policy covers', () => {
    expect(EU_CONSENT_REGIONS).toHaveLength(32)
    expect(new Set(EU_CONSENT_REGIONS).size).toBe(32)

    const eu27 = [
      'AT',
      'BE',
      'BG',
      'HR',
      'CY',
      'CZ',
      'DK',
      'EE',
      'FI',
      'FR',
      'DE',
      'GR',
      'HU',
      'IE',
      'IT',
      'LV',
      'LT',
      'LU',
      'MT',
      'NL',
      'PL',
      'PT',
      'RO',
      'SK',
      'SI',
      'ES',
      'SE',
    ]
    const nonEuEea = ['IS', 'LI', 'NO']
    const ukAndSwitzerland = ['GB', 'CH']

    for (const code of [...eu27, ...nonEuEea, ...ukAndSwitzerland]) {
      expect(EU_CONSENT_REGIONS).toContain(code)
    }
  })
})

describe('CONSENT_MODE_BOOTSTRAP', () => {
  it('emits the region-scoped denial BEFORE the unscoped grant', () => {
    const deniedIndex = CONSENT_MODE_BOOTSTRAP.indexOf("'analytics_storage': 'denied'")
    const grantedIndex = CONSENT_MODE_BOOTSTRAP.indexOf("'analytics_storage': 'granted'")

    expect(deniedIndex).toBeGreaterThan(-1)
    expect(grantedIndex).toBeGreaterThan(-1)
    expect(deniedIndex).toBeLessThan(grantedIndex)
  })

  it('scopes the denial to the 32 consent regions', () => {
    expect(CONSENT_MODE_BOOTSTRAP).toContain(`'region': ${JSON.stringify([...EU_CONSENT_REGIONS])}`)
    // The region key must appear exactly once: only the denial is scoped.
    expect(CONSENT_MODE_BOOTSTRAP.match(/'region'/g)).toHaveLength(1)
  })

  it('holds tags for the stored-choice restore via wait_for_update', () => {
    expect(CONSENT_WAIT_FOR_UPDATE_MS).toBe(500)
    expect(CONSENT_MODE_BOOTSTRAP).toContain(`'wait_for_update': ${CONSENT_WAIT_FOR_UPDATE_MS}`)
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
