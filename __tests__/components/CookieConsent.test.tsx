import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
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
})
