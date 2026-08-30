/**
 * @jest-environment jsdom
 * @jest-environment-options {"url": "https://www.support.example.org/"}
 *
 * Cookie deletion scope coverage on a MULTI-LABEL hostname.
 *
 * On a subdomain-hosted deployment a tag may have scoped its cookie to
 * any ancestor domain (GA4 defaults to the registrable domain with a
 * leading dot), and a cookie can only be deleted by a write whose Domain
 * attribute matches the one it was set with. expireCookies therefore
 * label-walks the hostname: every suffix with at least two labels, with
 * and without a leading dot, plus a host-only write. Public-suffix
 * attempts are harmless no-ops — browsers reject those writes.
 */
import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import CookieConsent from '../../src/components/cookie-consent'

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  // Leave the property re-definable for any later suite in this worker.
  configurable: true,
})

describe('CookieConsent cookie deletion scopes (multi-label hostname)', () => {
  beforeEach(() => {
    localStorageMock.clear()
    window.dataLayer = []
  })

  it('label-walks www.support.example.org: every 2+-label suffix, dotted and undotted, plus host-only', async () => {
    expect(window.location.hostname).toBe('www.support.example.org')

    const writes: string[] = []
    const cookieDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie')!
    Object.defineProperty(document, 'cookie', {
      configurable: true,
      get: () => cookieDescriptor.get!.call(document),
      set: (value: string) => {
        writes.push(value)
        cookieDescriptor.set!.call(document, value)
      },
    })

    try {
      render(<CookieConsent />)

      await waitFor(
        () => {
          expect(screen.getByText('Decline All')).toBeInTheDocument()
        },
        { timeout: 2000 }
      )

      fireEvent.click(screen.getByText('Decline All'))

      const expectedDomains = [
        'www.support.example.org',
        '.www.support.example.org',
        'support.example.org',
        '.support.example.org',
        'example.org',
        '.example.org',
      ]

      const gaExpiries = writes.filter((w) => w.startsWith('_ga=') && w.includes('01 Jan 1970'))

      // Host-only write (no Domain attribute).
      expect(gaExpiries.some((w) => !w.includes('domain='))).toBe(true)
      // Every 2+-label suffix, with and without the leading dot.
      for (const domain of expectedDomains) {
        expect(gaExpiries.some((w) => w.includes(` domain=${domain};`))).toBe(true)
      }
      // But never a single-label suffix — 'org' alone must not be attempted.
      expect(gaExpiries.some((w) => / domain=\.?org;/.test(w))).toBe(false)
    } finally {
      Reflect.deleteProperty(document, 'cookie')
    }
  })
})
