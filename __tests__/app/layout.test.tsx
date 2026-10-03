import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

jest.mock(
  '../../src/components/footer',
  () =>
    function MockFooter() {
      return <footer>Footer</footer>
    }
)

jest.mock(
  '../../src/components/cookie-consent',
  () =>
    function MockCookieConsent() {
      return null
    }
)

jest.mock('../../src/components/google-tag-manager', () => ({
  __esModule: true,
  // Render a marker so tests can assert on the GTM script's position in
  // the document, relative to the Consent Mode bootstrap.
  default: function MockGoogleTagManager() {
    return <script id="gtm-script" />
  },
  GoogleTagManagerNoScript: function MockGoogleTagManagerNoScript() {
    return null
  },
}))

import RootLayout from '../../src/app/layout'
import { EU_CONSENT_REGIONS } from '../../src/lib/consent-mode'
import { siteConfig } from '../../src/lib/site.config'

describe('Root layout', () => {
  it('preserves the skip link without wrapping route pages in another main landmark', () => {
    const markup = renderToStaticMarkup(
      <RootLayout>
        <main id="main-content">Route content</main>
      </RootLayout>
    )
    const document = new DOMParser().parseFromString(markup, 'text/html')

    expect(document.querySelector('.skip-to-content')?.getAttribute('href')).toBe('#main-content')
    expect(document.querySelectorAll('main')).toHaveLength(1)
  })

  it('renders required security metadata in the document head', () => {
    const markup = renderToStaticMarkup(
      <RootLayout>
        <main id="main-content">Route content</main>
      </RootLayout>
    )
    const document = new DOMParser().parseFromString(markup, 'text/html')

    const csp = document.querySelector('meta[http-equiv="Content-Security-Policy"]')
    expect(csp?.getAttribute('content')).toContain("default-src 'self'")
    expect(csp?.getAttribute('content')).toContain('https://www.googletagmanager.com')
    expect(csp?.getAttribute('content')).toContain("object-src 'none'")
    expect(csp?.getAttribute('content')).toContain("base-uri 'self'")

    expect(document.querySelector('meta[name="referrer"]')?.getAttribute('content')).toBe(
      'strict-origin-when-cross-origin'
    )
    expect(document.querySelector('meta[name="color-scheme"]')?.getAttribute('content')).toBe(
      'light'
    )
    // Sourced from siteConfig so a fork's brand colour does not fail this suite;
    // the manifest reads the same field, asserted in manifest-lighthouse-parity.
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(
      siteConfig.themeColor
    )
  })

  it('emits the Consent Mode default bootstrap before the GTM script', () => {
    const markup = renderToStaticMarkup(
      <RootLayout>
        <main id="main-content">Route content</main>
      </RootLayout>
    )

    const bootstrapIndex = markup.indexOf('id="consent-mode-default"')
    const gtmIndex = markup.indexOf('id="gtm-script"')

    expect(bootstrapIndex).toBeGreaterThan(-1)
    expect(gtmIndex).toBeGreaterThan(-1)
    expect(bootstrapIndex).toBeLessThan(gtmIndex)
  })

  it('emits BOTH consent defaults, region-scoped and unscoped', () => {
    const markup = renderToStaticMarkup(
      <RootLayout>
        <main id="main-content">Route content</main>
      </RootLayout>
    )

    // Asserted on the RENDERED markup rather than on the exported constant,
    // which is the point of keeping this case: it is the only check that
    // what actually reaches the page carries the contract. A lib-level test
    // passes even if the layout stops emitting the bootstrap.
    //
    // This case previously asserted ONE unscoped denial and the ABSENCE of a
    // region key — the global model this branch reversed. The shape of the
    // contract changed; the reason for checking it at the layout level did
    // not.
    const defaultCalls = markup.split("gtag('consent', 'default'").length - 1
    expect(defaultCalls).toBe(2)
    expect(markup).toContain("'region'")
    expect(markup).toContain('"CH"')

    // Stronger than those substrings, and kept from `main`, which asserted it
    // as a separate case: the code list the layout actually emits must be the
    // exported constant, all 32 of them. A bootstrap that emitted a region key
    // with three codes in it satisfies everything above.
    expect(EU_CONSENT_REGIONS).toHaveLength(32)
    expect(markup).toContain(`'region': ${JSON.stringify([...EU_CONSENT_REGIONS])}`)

    // The regional split, on the page: denied inside the region, analytics
    // granted outside it.
    expect(markup).toContain("'analytics_storage': 'denied'")
    expect(markup).toContain("'analytics_storage': 'granted'")

    // The GPC / stored-opt-out read has to reach the page too. A bootstrap
    // that lost it would still satisfy every assertion above.
    expect(markup).toContain('globalPrivacyControl')
  })

  it('ships no GTM noscript iframe for consent to miss', () => {
    const markup = renderToStaticMarkup(
      <RootLayout>
        <main id="main-content">Route content</main>
      </RootLayout>
    )

    // With JavaScript off the bootstrap never runs and the banner never
    // renders, so this iframe was the one Google request no visitor could
    // refuse. Asserted here, on the rendered layout, because that is where
    // it used to be mounted.
    expect(markup).not.toContain('googletagmanager.com/ns.html')
  })
})
