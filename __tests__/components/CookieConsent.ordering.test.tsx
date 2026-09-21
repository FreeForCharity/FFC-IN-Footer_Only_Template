/**
 * Consent Mode ordering guarantees, tested with a REAL (non-placeholder)
 * GA4 measurement id so the direct GA loader actually injects scripts.
 *
 * The race this locks out: a returning visitor OUTSIDE the EEA/UK/CH who
 * previously DECLINED analytics runs under the unscoped granted-by-default
 * bootstrap. If GA's `config` were queued before the stored denial's
 * `consent update`, GA could set cookies and send a cookie-based hit
 * before the denial applied — the bootstrap's `wait_for_update` on the
 * grant only buys a 500ms window, it is not an ordering guarantee. The
 * component must therefore push the consent update BEFORE injecting the
 * GA script — one ordered path, no earlier mount effect that loads GA
 * before the stored-choice restore.
 */
import React from 'react'
import { render, waitFor } from '@testing-library/react'

const REAL_GA_ID = 'G-TEST1234AB'

// The GA id is read once at the component module's load, so set the env
// BEFORE requiring it (a require, not a hoisted import — and no
// jest.resetModules BEFORE the require, which would hand the component a
// second React copy). afterAll restores the env and THEN resets modules,
// so no later in-band suite can require the copy cached with the real GA
// id baked in.
const ORIGINAL_GA_ENV = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = REAL_GA_ID
const CookieConsent = require('../../src/components/cookie-consent')
  .default as typeof import('../../src/components/cookie-consent').default

afterAll(() => {
  if (ORIGINAL_GA_ENV === undefined) {
    delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
  } else {
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = ORIGINAL_GA_ENV
  }
  // Purge the module cache too: the component copy cached above has the
  // real GA id baked in, and a later in-band suite requiring it would
  // get that copy instead of one that reads the restored env.
  jest.resetModules()
})

// Mock localStorage (jsdom's is fine, but keep parity with the main suite)
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

describe('CookieConsent Consent Mode ordering (real GA id)', () => {
  let events: string[]
  let appendChildSpy: jest.SpyInstance
  // Keep our own handle on the mock: jsdom executes the injected GA config
  // script, whose `function gtag()` declaration overwrites window.gtag.
  let gtagMock: jest.Mock

  beforeEach(() => {
    localStorageMock.clear()
    window.dataLayer = []
    events = []

    // Record every Consent Mode update, in order.
    gtagMock = jest.fn((...args: unknown[]) => {
      if (args[0] === 'consent' && args[1] === 'update') {
        events.push('consent-update')
      }
    })
    window.gtag = gtagMock

    // Record GA script injection, in order, without breaking appendChild.
    const originalAppendChild = document.head.appendChild.bind(document.head)
    appendChildSpy = jest.spyOn(document.head, 'appendChild').mockImplementation((node) => {
      if (
        node instanceof HTMLScriptElement &&
        (node.src || '').includes('googletagmanager.com/gtag')
      ) {
        events.push('ga-script')
      }
      return originalAppendChild(node)
    })
  })

  afterEach(() => {
    appendChildSpy.mockRestore()
    // Not `delete`: the executed GA config script's function declaration
    // makes window.gtag a non-configurable global.
    window.gtag = undefined
    // Remove injected GA scripts so each test starts clean.
    document
      .querySelectorAll('script[src*="googletagmanager.com/gtag"]')
      .forEach((el) => el.remove())
    document.head
      .querySelectorAll('script')
      .forEach((el) => el.textContent?.includes(REAL_GA_ID) && el.remove())
  })

  it('pushes the stored DENIAL consent update BEFORE injecting the GA script on restore', async () => {
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

    await waitFor(() => {
      expect(events).toContain('consent-update')
      expect(events).toContain('ga-script')
    })

    // The denial must be in the dataLayer ahead of GA's config.
    expect(events.indexOf('consent-update')).toBeLessThan(events.indexOf('ga-script'))
    expect(gtagMock).toHaveBeenCalledWith(
      'consent',
      'update',
      expect.objectContaining({ analytics_storage: 'denied', ad_storage: 'denied' })
    )
  })

  it('still loads GA (regional defaults, no update needed) when no choice is stored', async () => {
    render(<CookieConsent />)

    await waitFor(() => {
      expect(events).toContain('ga-script')
    })

    // No stored choice → nothing to restore → no consent update pushed.
    expect(events).not.toContain('consent-update')
  })
  it('queues the Consent Mode update BEFORE the custom consent_update event', async () => {
    // In production both writes reach the same dataLayer queue and GTM
    // processes it in order, so a container trigger keyed on `consent_update`
    // must not be able to run before this choice's consent state is queued.
    //
    // What this case asserts is the CALL order that produces that queue
    // order: window.gtag is a mock here, so the Consent Mode update never
    // actually reaches dataLayer during the test. That is enough to
    // discriminate the defect — swapping the two makes this fail — but it is
    // not a direct assertion about dataLayer contents.
    const queue = window.dataLayer as unknown[]
    // `queue` is a fresh array each test, so `push` is inherited from
    // Array.prototype and there is no own property to put back: deleting the
    // override is what restores it. The `finally` is the point — a failing
    // assertion below would otherwise leave this array instrumented, and the
    // next thing to push through it would record a phantom event.
    const originalPush = queue.push.bind(queue)
    queue.push = ((...entries: unknown[]) => {
      for (const entry of entries) {
        if ((entry as { event?: string } | undefined)?.event === 'consent_update') {
          events.push('custom-consent-event')
        }
      }
      return originalPush(...entries)
    }) as typeof queue.push

    try {
      localStorageMock.setItem(
        'cookie-consent',
        JSON.stringify({ necessary: true, functional: true, analytics: false, marketing: false })
      )

      render(<CookieConsent />)

      await waitFor(() => {
        expect(events).toContain('consent-update')
        expect(events).toContain('custom-consent-event')
      })

      expect(events.indexOf('consent-update')).toBeLessThan(events.indexOf('custom-consent-event'))
    } finally {
      Reflect.deleteProperty(queue, 'push')
    }
  })
})
