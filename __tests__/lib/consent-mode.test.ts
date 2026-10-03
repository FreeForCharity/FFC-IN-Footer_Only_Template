import {
  CONSENT_WAIT_FOR_UPDATE_MS,
  CONSENT_MODE_BOOTSTRAP,
  EU_CONSENT_REGIONS,
  SALE_SHARE_OPT_OUT_EVENT,
  SALE_SHARE_OPT_OUT_KEY,
  hasSaleShareOptOut,
  isConfigured,
  setSaleShareOptOut,
  updateGoogleConsent,
} from '../../src/lib/consent-mode'

/**
 * These assertions were REWRITTEN when this branch restored regional gating.
 * They previously locked a single unscoped worldwide denial. That is not a
 * weakening to accommodate a change: the absence assertion below is inverted
 * rather than deleted, because under the regional model the dangerous edit is
 * the opposite one.
 *
 * Under a global denial the risk was a permissive default reappearing, so the
 * test asserted that nothing was ever granted. Analytics IS granted outside
 * the EEA/UK/CH by design now, so that assertion would be asserting the bug.
 * What must never happen is the REGION-SCOPED call quietly losing its region
 * key and applying to everyone — a one-line edit that every positive
 * assertion here would still pass.
 */

/**
 * Run `fn` with localStorage refusing every operation, as a private window
 * does, then restore the real one.
 *
 * Done by swapping the whole object rather than with `jest.spyOn`: jsdom's
 * Storage methods are not spy-able on the instance here (spyOn returns an
 * object with no mockImplementation), and this repo's other suites already
 * replace localStorage wholesale via defineProperty.
 */
function withStorageThrowing<T>(fn: () => T): T {
  const real = window.localStorage
  const boom = () => {
    throw new Error('storage disabled')
  }
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: { getItem: boom, setItem: boom, removeItem: boom, clear: () => {} },
  })
  try {
    return fn()
  } finally {
    Object.defineProperty(window, 'localStorage', { configurable: true, value: real })
  }
}

/** The body of each `consent default` call, in source order. */
function defaultCallBlocks(src: string): string[] {
  return src
    .split("gtag('consent', 'default', {")
    .slice(1)
    .map((chunk) => chunk.slice(0, chunk.indexOf('});')))
}

describe('CONSENT_MODE_BOOTSTRAP', () => {
  it('emits TWO defaults: a region-scoped denial and an unscoped default', () => {
    const blocks = defaultCallBlocks(CONSENT_MODE_BOOTSTRAP)
    expect(blocks).toHaveLength(2)

    const scoped = blocks.filter((b) => b.includes("'region'"))
    const unscoped = blocks.filter((b) => !b.includes("'region'"))
    expect(scoped).toHaveLength(1)
    expect(unscoped).toHaveLength(1)
  })

  it('scopes the denial to the EEA, the UK and Switzerland', () => {
    const scoped = defaultCallBlocks(CONSENT_MODE_BOOTSTRAP).find((b) => b.includes("'region'"))!

    // Spot-check one EU member, the UK and Switzerland. Switzerland is the
    // one most easily dropped: it is neither EU nor EEA, and Google's EU User
    // Consent Policy covers it anyway.
    expect(scoped).toContain('"DE"')
    expect(scoped).toContain('"GB"')
    expect(scoped).toContain('"CH"')
    expect(EU_CONSENT_REGIONS).toHaveLength(32)
  })

  it('denies every measurement signal inside the scoped region', () => {
    const scoped = defaultCallBlocks(CONSENT_MODE_BOOTSTRAP).find((b) => b.includes("'region'"))!
    for (const signal of [
      'analytics_storage',
      'ad_storage',
      'ad_user_data',
      'ad_personalization',
      'personalization_storage',
    ]) {
      expect(scoped).toContain(`'${signal}': 'denied'`)
    }
    expect(scoped).toContain("'functionality_storage': 'granted'")
    expect(scoped).toContain("'security_storage': 'granted'")
  })

  it('grants analytics outside the scoped region, but never ad personalisation', () => {
    const unscoped = defaultCallBlocks(CONSENT_MODE_BOOTSTRAP).find((b) => !b.includes("'region'"))!
    expect(unscoped).toContain("'analytics_storage': 'granted'")

    // Ad Grants is search-only, so personalisation buys nothing and carries
    // the heaviest legal weight. It ships denied regardless of the opt-out.
    expect(unscoped).toContain("'ad_personalization': 'denied'")
    expect(unscoped).toContain("'personalization_storage': 'denied'")
  })

  it('NO region-scoped call may grant anything but functionality/security', () => {
    // The inverted absence assertion. This is the single edit that would
    // start measuring EEA visitors before they consent.
    const scopedGrants = defaultCallBlocks(CONSENT_MODE_BOOTSTRAP)
      .filter((b) => b.includes("'region'"))
      .flatMap((b) =>
        b
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l.includes("'granted'"))
      )
      .filter(
        (l) => !l.startsWith("'functionality_storage'") && !l.startsWith("'security_storage'")
      )
    expect(scopedGrants).toEqual([])
  })

  it('gates advertising on GPC and the stored opt-out BEFORE the first default', () => {
    const firstDefault = CONSENT_MODE_BOOTSTRAP.indexOf("gtag('consent', 'default'")
    const preamble = CONSENT_MODE_BOOTSTRAP.slice(0, firstDefault)

    // Read before any tag can evaluate consent, not a beat later via update.
    expect(preamble).toContain('navigator.globalPrivacyControl === true')
    expect(preamble).toContain(SALE_SHARE_OPT_OUT_KEY)

    // In try/catch: an unguarded localStorage read THROWS in some privacy
    // modes, which would abort the inline script and leave NO defaults at
    // all — failing open. Without this the guard fails in the one direction
    // that matters.
    expect(preamble).toContain('try {')
    expect(preamble).toContain('} catch (e) {}')
  })

  it('lets the opt-out flag tighten ONLY the unscoped default', () => {
    const blocks = defaultCallBlocks(CONSENT_MODE_BOOTSTRAP)
    const scoped = blocks.find((b) => b.includes("'region'"))!
    const unscoped = blocks.find((b) => !b.includes("'region'"))!

    // The scoped denial is already total, so mixing the flag in could only
    // ever loosen it.
    expect(scoped).not.toContain('ffcAdsDenied')
    expect(unscoped).toContain('ffcAdsDenied')
  })

  it('gates only the ad signals on the opt-out, never analytics', () => {
    const unscoped = defaultCallBlocks(CONSENT_MODE_BOOTSTRAP).find((b) => !b.includes("'region'"))!
    // GPC is an opt-out of sale/sharing, NOT of first-party analytics.
    // Letting analytics follow the flag would over-apply the signal.
    expect(unscoped).not.toContain("'analytics_storage': ffcAdsDenied")
  })

  it('holds tags with wait_for_update on BOTH defaults', () => {
    expect(CONSENT_WAIT_FOR_UPDATE_MS).toBe(500)
    const occurrences =
      CONSENT_MODE_BOOTSTRAP.split(`'wait_for_update': ${CONSENT_WAIT_FOR_UPDATE_MS}`).length - 1
    expect(occurrences).toBe(2)
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
    window.localStorage.clear()
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

  it('grants storage and conversion signals on a full accept, but NOT personalisation', () => {
    const gtag = jest.fn()
    window.gtag = gtag

    updateGoogleConsent({ necessary: true, functional: true, analytics: true, marketing: true })

    // ad_storage and ad_user_data are what Ad Grants conversion tracking
    // needs. ad_personalization is not, and stays denied unless a site
    // deliberately opts into personalised (non-Grant) advertising.
    expect(gtag).toHaveBeenCalledWith('consent', 'update', {
      analytics_storage: 'granted',
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'denied',
      personalization_storage: 'denied',
      functionality_storage: 'granted',
      security_storage: 'granted',
    })
  })

  it('honours an explicit adsDenied override without reading storage', () => {
    const gtag = jest.fn()
    window.gtag = gtag

    // The override exists so a caller that already knows the opt-out state
    // does not depend on a storage re-read that can throw.
    updateGoogleConsent(
      { necessary: true, functional: true, analytics: true, marketing: true },
      { adsDenied: true }
    )

    expect(gtag).toHaveBeenCalledWith(
      'consent',
      'update',
      expect.objectContaining({
        ad_storage: 'denied',
        ad_user_data: 'denied',
        analytics_storage: 'granted',
      })
    )
  })

  it('a stored sale/share opt-out overrides an accept-everything choice', () => {
    const gtag = jest.fn()
    window.gtag = gtag
    window.localStorage.setItem(SALE_SHARE_OPT_OUT_KEY, 'true')

    updateGoogleConsent({ necessary: true, functional: true, analytics: true, marketing: true })

    // Analytics is untouched: the opt-out is of sale/sharing, not measurement.
    expect(gtag).toHaveBeenCalledWith(
      'consent',
      'update',
      expect.objectContaining({
        analytics_storage: 'granted',
        ad_storage: 'denied',
        ad_user_data: 'denied',
      })
    )
  })
})

describe('setSaleShareOptOut', () => {
  afterEach(() => {
    delete window.gtag
    window.localStorage.clear()
  })

  it('denies the ad signals immediately when opting out', () => {
    const gtag = jest.fn()
    window.gtag = gtag

    setSaleShareOptOut(true)

    expect(window.localStorage.getItem(SALE_SHARE_OPT_OUT_KEY)).toBe('true')
    expect(gtag).toHaveBeenCalledWith('consent', 'update', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      personalization_storage: 'denied',
    })
  })

  it('NEVER grants without preferences — clearing only removes the flag', () => {
    const gtag = jest.fn()
    window.gtag = gtag
    window.localStorage.setItem(SALE_SHARE_OPT_OUT_KEY, 'true')

    setSaleShareOptOut(false)

    // An earlier revision pushed ad_storage/ad_user_data to 'granted' here,
    // overriding the banner's marketing toggle on no evidence at all —
    // including for an EEA visitor who never accepted anything. With no
    // prefs there is nothing to re-derive a grant from, so this path may
    // only tighten or do nothing.
    expect(window.localStorage.getItem(SALE_SHARE_OPT_OUT_KEY)).toBeNull()
    expect(gtag).not.toHaveBeenCalled()
  })

  it('defers to the banner preferences when they are supplied', () => {
    const gtag = jest.fn()
    window.gtag = gtag

    setSaleShareOptOut(false, {
      necessary: true,
      functional: true,
      analytics: true,
      marketing: false,
    })

    expect(gtag).toHaveBeenCalledWith(
      'consent',
      'update',
      expect.objectContaining({ analytics_storage: 'granted', ad_storage: 'denied' })
    )
  })

  it('WITH prefs, still denies ads when localStorage throws', () => {
    const gtag = jest.fn()
    window.gtag = gtag

    // The hole this closes: setSaleShareOptOut(true, prefs) wrote the flag,
    // and when the write threw it delegated to updateGoogleConsent, which
    // re-read storage, threw, and reported "not opted out" from its catch. A
    // prefs.marketing === true then GRANTED advertising, discarding the
    // opt-out argument that was the entire point of the call.
    //
    // Same defect class as the no-prefs case below, surviving one branch
    // over: an invariant stated in one layer and violated in the next.
    withStorageThrowing(() =>
      setSaleShareOptOut(true, {
        necessary: true,
        functional: true,
        analytics: true,
        marketing: true,
      })
    )

    expect(gtag).toHaveBeenCalledWith(
      'consent',
      'update',
      expect.objectContaining({
        ad_storage: 'denied',
        ad_user_data: 'denied',
        // Analytics is untouched: this is an opt-out of sale/sharing.
        analytics_storage: 'granted',
      })
    )
  })

  it('notifies the non-Google tags, which cannot hear a consent update', () => {
    const seen: string[] = []
    const onOptOut = () => seen.push('opt-out')
    window.addEventListener(SALE_SHARE_OPT_OUT_EVENT, onOptOut)
    try {
      setSaleShareOptOut(true)
    } finally {
      window.removeEventListener(SALE_SHARE_OPT_OUT_EVENT, onOptOut)
    }

    // Consent Mode governs Google only. Without this event the Meta Pixel
    // keeps its cookies and reloads on the next page, while the footer
    // control claims advertising sharing is off.
    expect(seen).toEqual(['opt-out'])
  })

  it('does NOT announce an opt-out when clearing the flag', () => {
    const seen: string[] = []
    const onOptOut = () => seen.push('opt-out')
    window.addEventListener(SALE_SHARE_OPT_OUT_EVENT, onOptOut)
    try {
      setSaleShareOptOut(false)
    } finally {
      window.removeEventListener(SALE_SHARE_OPT_OUT_EVENT, onOptOut)
    }
    expect(seen).toEqual([])
  })

  it('still denies for this session when localStorage throws', () => {
    const gtag = jest.fn()
    window.gtag = gtag

    withStorageThrowing(() => setSaleShareOptOut(true))

    // The deny is keyed on the ARGUMENT, not on a re-read of stored state.
    // An earlier revision gated it on hasSaleShareOptOut(), whose catch
    // reports false when the read throws — so clicking the control did
    // nothing at all in exactly the browsers whose users most want it.
    expect(gtag).toHaveBeenCalledWith(
      'consent',
      'update',
      expect.objectContaining({ ad_storage: 'denied' })
    )
  })
})

describe('hasSaleShareOptOut', () => {
  afterEach(() => {
    window.localStorage.clear()
  })

  it('is false with no signal and no stored flag', () => {
    expect(hasSaleShareOptOut()).toBe(false)
  })

  it('is true from the stored flag', () => {
    window.localStorage.setItem(SALE_SHARE_OPT_OUT_KEY, 'true')
    expect(hasSaleShareOptOut()).toBe(true)
  })

  it('reports false rather than throwing when storage is unavailable', () => {
    expect(withStorageThrowing(() => hasSaleShareOptOut())).toBe(false)
  })
})
