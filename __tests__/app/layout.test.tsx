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

  it('emits ONE unscoped denied consent default, with no region scoping', () => {
    const markup = renderToStaticMarkup(
      <RootLayout>
        <main id="main-content">Route content</main>
      </RootLayout>
    )

    // Asserted on the RENDERED markup rather than on the exported constant,
    // which is the point of keeping this case: it is the only check that
    // what actually reaches the page carries the contract. A lib-level test
    // passes even if the layout stops emitting the bootstrap.
    const defaultCalls = markup.split("gtag('consent', 'default'").length - 1
    expect(defaultCalls).toBe(1)
    expect(markup).toContain("'analytics_storage': 'denied'")

    // By absence too. This case previously asserted that the denial came
    // BEFORE the grant, which is satisfied by any file containing both --
    // so it would have passed unchanged against a permissive default.
    expect(markup).not.toContain("'analytics_storage': 'granted'")
    expect(markup).not.toContain("'ad_storage': 'granted'")
    expect(markup).not.toContain("'region'")
  })
})
