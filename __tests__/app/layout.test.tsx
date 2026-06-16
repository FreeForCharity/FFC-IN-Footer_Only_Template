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
  default: function MockGoogleTagManager() {
    return null
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
})
