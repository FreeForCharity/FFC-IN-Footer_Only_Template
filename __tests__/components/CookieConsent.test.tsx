import React from 'react'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import CookieConsent from '../../src/components/cookie-consent'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

// Mock localStorage
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
})

describe('CookieConsent component', () => {
  beforeEach(() => {
    localStorageMock.clear()
    window.dataLayer = []
    window.gtag = jest.fn()
  })

  afterEach(() => {
    delete window.gtag
  })

  it('should show cookie banner on first visit', async () => {
    render(<CookieConsent />)

    await waitFor(
      () => {
        expect(screen.queryByText(/cookies/i)).toBeInTheDocument()
      },
      { timeout: 2000 }
    )
  })

  it('should display banner when no preferences are saved', async () => {
    render(<CookieConsent />)

    await waitFor(
      () => {
        const banner = screen.queryByText(/cookies/i)
        expect(banner).toBeInTheDocument()
      },
      { timeout: 2000 }
    )
  })

  it('should not show banner if preferences are already saved', () => {
    localStorageMock.setItem(
      'cookie-consent',
      JSON.stringify({
        necessary: true,
        functional: true,
        analytics: false,
        marketing: false,
      })
    )

    render(<CookieConsent />)

    // Banner should not appear immediately if consent is already saved
    const banner = screen.queryByText(/We use cookies/i)
    expect(banner).not.toBeInTheDocument()
  })

  it('should have a link to privacy policy', async () => {
    render(<CookieConsent />)

    await waitFor(
      () => {
        const privacyLinks = screen.queryAllByText(/Privacy Policy/i)
        expect(privacyLinks.length).toBeGreaterThanOrEqual(1)
      },
      { timeout: 2000 }
    )
  })

  it('should have a link to cookie policy', async () => {
    render(<CookieConsent />)

    await waitFor(
      () => {
        const cookieLinks = screen.queryAllByText(/Cookie Policy/i)
        expect(cookieLinks.length).toBeGreaterThanOrEqual(1)
      },
      { timeout: 2000 }
    )
  })

  it('should display Accept All, Decline All, and Customize buttons', async () => {
    render(<CookieConsent />)

    await waitFor(
      () => {
        expect(screen.getByText('Accept All')).toBeInTheDocument()
        expect(screen.getByText('Decline All')).toBeInTheDocument()
        expect(screen.getByText('Customize')).toBeInTheDocument()
      },
      { timeout: 2000 }
    )
  })

  it('should hide banner after Accept All is clicked', async () => {
    render(<CookieConsent />)

    await waitFor(
      () => {
        expect(screen.getByText('Accept All')).toBeInTheDocument()
      },
      { timeout: 2000 }
    )

    fireEvent.click(screen.getByText('Accept All'))
    expect(screen.queryByText('Accept All')).not.toBeInTheDocument()
  })

  it('should save all-accepted preferences to localStorage on Accept All', async () => {
    render(<CookieConsent />)

    await waitFor(
      () => {
        expect(screen.getByText('Accept All')).toBeInTheDocument()
      },
      { timeout: 2000 }
    )

    fireEvent.click(screen.getByText('Accept All'))

    const saved = JSON.parse(localStorageMock.getItem('cookie-consent')!)
    expect(saved.analytics).toBe(true)
    expect(saved.marketing).toBe(true)
    expect(saved.necessary).toBe(true)
    expect(saved.functional).toBe(true)
  })

  it('should hide banner after Decline All is clicked', async () => {
    render(<CookieConsent />)

    await waitFor(
      () => {
        expect(screen.getByText('Decline All')).toBeInTheDocument()
      },
      { timeout: 2000 }
    )

    fireEvent.click(screen.getByText('Decline All'))
    expect(screen.queryByText('Decline All')).not.toBeInTheDocument()
  })

  it('should save declined preferences to localStorage on Decline All', async () => {
    render(<CookieConsent />)

    await waitFor(
      () => {
        expect(screen.getByText('Decline All')).toBeInTheDocument()
      },
      { timeout: 2000 }
    )

    fireEvent.click(screen.getByText('Decline All'))

    const saved = JSON.parse(localStorageMock.getItem('cookie-consent')!)
    expect(saved.analytics).toBe(false)
    expect(saved.marketing).toBe(false)
    expect(saved.necessary).toBe(true)
    expect(saved.functional).toBe(true)
  })

  it('should open preferences modal when Customize is clicked', async () => {
    render(<CookieConsent />)

    await waitFor(
      () => {
        expect(screen.getByText('Customize')).toBeInTheDocument()
      },
      { timeout: 2000 }
    )

    fireEvent.click(screen.getByText('Customize'))
    expect(screen.getByText('Cookie Preferences')).toBeInTheDocument()
  })

  it('should display all cookie categories in preferences modal', async () => {
    render(<CookieConsent />)

    await waitFor(
      () => {
        expect(screen.getByText('Customize')).toBeInTheDocument()
      },
      { timeout: 2000 }
    )

    fireEvent.click(screen.getByText('Customize'))

    expect(screen.getByText('Necessary Cookies')).toBeInTheDocument()
    expect(screen.getByText('Functional Cookies')).toBeInTheDocument()
    expect(screen.getByText('Analytics Cookies')).toBeInTheDocument()
    expect(screen.getByText('Marketing Cookies')).toBeInTheDocument()
  })

  it('should have Save Preferences and Cancel buttons in modal', async () => {
    render(<CookieConsent />)

    await waitFor(
      () => {
        expect(screen.getByText('Customize')).toBeInTheDocument()
      },
      { timeout: 2000 }
    )

    fireEvent.click(screen.getByText('Customize'))

    expect(screen.getByText('Save Preferences')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('should push consent_update event to dataLayer on accept', async () => {
    render(<CookieConsent />)

    await waitFor(
      () => {
        expect(screen.getByText('Accept All')).toBeInTheDocument()
      },
      { timeout: 2000 }
    )

    fireEvent.click(screen.getByText('Accept All'))

    const consentEvent = window.dataLayer.find(
      (e: { event: string }) => e.event === 'consent_update'
    )
    expect(consentEvent).toBeDefined()
    expect(consentEvent?.analytics_consent).toBe('granted')
    expect(consentEvent?.marketing_consent).toBe('granted')
  })

  it('should not have accessibility violations when visible', async () => {
    const { container } = render(<CookieConsent />)

    await waitFor(
      async () => {
        const banner = screen.queryByText(/cookies/i)
        if (banner) {
          const results = await axe(container)
          expect(results).toHaveNoViolations()
        }
      },
      { timeout: 2000 }
    )
  })

  it('should save custom preferences when Save Preferences is clicked', async () => {
    render(<CookieConsent />)

    await waitFor(
      () => {
        expect(screen.getByText('Customize')).toBeInTheDocument()
      },
      { timeout: 2000 }
    )

    fireEvent.click(screen.getByText('Customize'))
    expect(screen.getByText('Cookie Preferences')).toBeInTheDocument()

    // Toggle analytics on
    fireEvent.click(screen.getByLabelText('Enable analytics cookies'))

    fireEvent.click(screen.getByText('Save Preferences'))

    expect(screen.queryByText('Cookie Preferences')).not.toBeInTheDocument()

    const saved = JSON.parse(localStorageMock.getItem('cookie-consent')!)
    expect(saved.analytics).toBe(true)
    expect(saved.marketing).toBe(false)
  })

  it('should cancel and restore previous preferences', async () => {
    render(<CookieConsent />)

    await waitFor(
      () => {
        expect(screen.getByText('Customize')).toBeInTheDocument()
      },
      { timeout: 2000 }
    )

    fireEvent.click(screen.getByText('Customize'))
    fireEvent.click(screen.getByLabelText('Enable analytics cookies'))

    // Cancel instead of saving
    fireEvent.click(screen.getByText('Cancel'))

    expect(screen.queryByText('Cookie Preferences')).not.toBeInTheDocument()
    expect(screen.getByText('Accept All')).toBeInTheDocument()
  })

  it('should toggle marketing cookies in preferences modal', async () => {
    render(<CookieConsent />)

    await waitFor(
      () => {
        expect(screen.getByText('Customize')).toBeInTheDocument()
      },
      { timeout: 2000 }
    )

    fireEvent.click(screen.getByText('Customize'))
    fireEvent.click(screen.getByLabelText('Enable marketing cookies'))

    fireEvent.click(screen.getByText('Save Preferences'))
    const saved = JSON.parse(localStorageMock.getItem('cookie-consent')!)
    expect(saved.marketing).toBe(true)
  })

  it('should close preferences modal on Escape key', async () => {
    render(<CookieConsent />)

    await waitFor(
      () => {
        expect(screen.getByText('Customize')).toBeInTheDocument()
      },
      { timeout: 2000 }
    )

    fireEvent.click(screen.getByText('Customize'))
    expect(screen.getByText('Cookie Preferences')).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByText('Cookie Preferences')).not.toBeInTheDocument()
  })

  it('should close preferences modal when clicking the overlay', async () => {
    render(<CookieConsent />)

    await waitFor(
      () => {
        expect(screen.getByText('Customize')).toBeInTheDocument()
      },
      { timeout: 2000 }
    )

    fireEvent.click(screen.getByText('Customize'))
    expect(screen.getByText('Cookie Preferences')).toBeInTheDocument()

    const overlay = screen.getByRole('dialog')
    fireEvent.click(overlay)

    expect(screen.queryByText('Cookie Preferences')).not.toBeInTheDocument()
  })

  it('should expose openCookiePreferences on window', async () => {
    render(<CookieConsent />)

    await waitFor(
      () => {
        expect(screen.getByText('Accept All')).toBeInTheDocument()
      },
      { timeout: 2000 }
    )

    fireEvent.click(screen.getByText('Accept All'))
    expect(screen.queryByText('Accept All')).not.toBeInTheDocument()

    expect(window.openCookiePreferences).toBeDefined()
    act(() => {
      window.openCookiePreferences!()
    })

    await waitFor(() => {
      expect(screen.getByText('Cookie Preferences')).toBeInTheDocument()
    })
  })

  it('should show banner if localStorage contains invalid JSON', () => {
    localStorageMock.setItem('cookie-consent', 'not-valid-json{')
    render(<CookieConsent />)
    expect(screen.queryByText(/cookies/i) || screen.queryByText('Accept All')).toBeTruthy()
  })

  it('should show banner if localStorage contains invalid structure', () => {
    localStorageMock.setItem('cookie-consent', JSON.stringify({ foo: 'bar' }))
    render(<CookieConsent />)
    expect(screen.queryByText(/cookies/i) || screen.queryByText('Accept All')).toBeTruthy()
  })

  it('should push a Google Consent Mode update on accept', async () => {
    render(<CookieConsent />)

    await waitFor(
      () => {
        expect(screen.getByText('Accept All')).toBeInTheDocument()
      },
      { timeout: 2000 }
    )

    fireEvent.click(screen.getByText('Accept All'))

    expect(window.gtag).toHaveBeenCalledWith(
      'consent',
      'update',
      expect.objectContaining({
        analytics_storage: 'granted',
        ad_storage: 'granted',
      })
    )
  })

  it('should push a denied Google Consent Mode update on decline', async () => {
    render(<CookieConsent />)

    await waitFor(
      () => {
        expect(screen.getByText('Decline All')).toBeInTheDocument()
      },
      { timeout: 2000 }
    )

    fireEvent.click(screen.getByText('Decline All'))

    expect(window.gtag).toHaveBeenCalledWith(
      'consent',
      'update',
      expect.objectContaining({
        analytics_storage: 'denied',
        ad_storage: 'denied',
      })
    )
  })

  it('should push a Google Consent Mode update when restoring a stored choice on load', async () => {
    localStorageMock.setItem(
      'cookie-consent',
      JSON.stringify({
        necessary: true,
        functional: true,
        analytics: true,
        marketing: false,
      })
    )

    render(<CookieConsent />)

    await waitFor(() => {
      expect(window.gtag).toHaveBeenCalledWith(
        'consent',
        'update',
        expect.objectContaining({
          analytics_storage: 'granted',
          ad_storage: 'denied',
        })
      )
    })
  })

  it('should not inject Clarity or Meta Pixel scripts with placeholder ids even on accept', async () => {
    render(<CookieConsent />)

    await waitFor(
      () => {
        expect(screen.getByText('Accept All')).toBeInTheDocument()
      },
      { timeout: 2000 }
    )

    fireEvent.click(screen.getByText('Accept All'))

    // The shipped placeholder ids keep every direct loader inert.
    expect(document.querySelector('script[src*="clarity.ms"]')).toBeNull()
    expect(document.querySelector('script[src*="fbevents.js"]')).toBeNull()
    expect(document.querySelector('script[src*="googletagmanager.com/gtag"]')).toBeNull()
  })

  it('should expire tracking cookies across host-only and dotted-domain scopes on decline', async () => {
    // Cookies set with a leading-dot Domain attribute (GA4's default for
    // _ga) can only be deleted by a write carrying that same attribute —
    // record every cookie write to verify all scopes are attempted.
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

      // jsdom runs on localhost — a single-label host, where a Domain
      // attribute is invalid — so label-walking produces no domain
      // candidates and only the host-only expiry is written. (Multi-label
      // hostnames are covered in CookieConsent.cookie-scopes.test.tsx.)
      for (const name of ['_ga', '_gid', '_fbp', 'fr', '_clck', '_clsk']) {
        const expiries = writes.filter((w) => w.startsWith(`${name}=`) && w.includes('01 Jan 1970'))
        expect(expiries.some((w) => !w.includes('domain='))).toBe(true)
        expect(expiries.some((w) => w.includes('domain='))).toBe(false)
      }
    } finally {
      Reflect.deleteProperty(document, 'cookie')
    }
  })

  it('should push denied consent to dataLayer on decline', async () => {
    render(<CookieConsent />)

    await waitFor(
      () => {
        expect(screen.getByText('Decline All')).toBeInTheDocument()
      },
      { timeout: 2000 }
    )

    fireEvent.click(screen.getByText('Decline All'))

    const consentEvent = window.dataLayer.find(
      (e: { event: string }) => e.event === 'consent_update'
    )
    expect(consentEvent).toBeDefined()
    expect(consentEvent?.analytics_consent).toBe('denied')
    expect(consentEvent?.marketing_consent).toBe('denied')
  })
})
