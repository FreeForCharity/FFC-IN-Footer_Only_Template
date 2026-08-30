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
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(
      '#ffffff'
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

  it('scopes the denied consent default to the 32 EU/EEA/UK/CH region codes', () => {
    const markup = renderToStaticMarkup(
      <RootLayout>
        <main id="main-content">Route content</main>
      </RootLayout>
    )

    expect(EU_CONSENT_REGIONS).toHaveLength(32)
    expect(markup).toContain(`'region': ${JSON.stringify([...EU_CONSENT_REGIONS])}`)

    // Both defaults are present, denial (region-scoped) before grant.
    const deniedIndex = markup.indexOf("'analytics_storage': 'denied'")
    const grantedIndex = markup.indexOf("'analytics_storage': 'granted'")
    expect(deniedIndex).toBeGreaterThan(-1)
    expect(grantedIndex).toBeGreaterThan(-1)
    expect(deniedIndex).toBeLessThan(grantedIndex)
  })
})
