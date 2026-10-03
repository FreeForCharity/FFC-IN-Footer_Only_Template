import { renderToString } from 'react-dom/server'
import * as gtm from '../../src/components/google-tag-manager'

/**
 * INVERTED DELIBERATELY. This suite used to render `GoogleTagManagerNoScript`
 * and assert the iframe was present, hidden and titled.
 *
 * The <noscript> GTM iframe is the one tracking path consent cannot reach:
 * with JavaScript disabled the Consent Mode bootstrap never runs, the cookie
 * banner never renders, and the footer's "Do Not Sell or Share" control does
 * not exist — but the iframe would still request the GTM container, carrying
 * no consent signal, with no way for a GPC-sending visitor to stop it. That
 * made the privacy policy's claim, that the consent check runs before any
 * Google tag loads, false for every JS-disabled visitor.
 *
 * It is asserted by ABSENCE because re-adding it is a one-line edit that a
 * presence-only suite would wave through, and the policy claim would silently
 * become false again.
 */
describe('Google Tag Manager noscript fallback', () => {
  it('no longer exports a noscript component', () => {
    expect('GoogleTagManagerNoScript' in gtm).toBe(false)
  })

  it('exports only the script loader', () => {
    // Guards the assertion above from passing for the wrong reason: a module
    // that failed to load would also lack the export.
    expect(typeof gtm.default).toBe('function')
  })

  it('renders no noscript element and no ns.html request', () => {
    const html = renderToString(<gtm.default />)
    expect(html).not.toContain('<noscript>')
    expect(html).not.toContain('googletagmanager.com/ns.html')
  })
})
