import React from 'react'
import { renderToString } from 'react-dom/server'
import GoogleTagManager, { GoogleTagManagerNoScript } from '../../src/components/google-tag-manager'
import { GTM_ID } from '../../src/lib/analytics.config'

// React suppresses <noscript> children in client-side renders (jsdom).
// We use server-side renderToString to verify the noscript markup.

// A test container id. It is deliberately NOT a real GTM container, and
// especially not the template's own: hardcoding that is how a fork's analytics
// end up reported into Free For Charity's property, which is the leak
// `npm run check:rebrand` exists to catch.
const TEST_GTM_ID = 'GTM-TEST000'

describe('GoogleTagManagerNoScript component', () => {
  describe('when a container is configured', () => {
    const html = renderToString(<GoogleTagManagerNoScript gtmId={TEST_GTM_ID} />)

    it('should render a noscript element', () => {
      expect(html).toContain('<noscript>')
    })

    it('should contain an iframe pointing to GTM', () => {
      expect(html).toContain('googletagmanager.com/ns.html')
      expect(html).toContain(TEST_GTM_ID)
    })

    it('should have the iframe hidden', () => {
      expect(html).toContain('height="0"')
      expect(html).toContain('width="0"')
    })

    it('should have an accessible title on the iframe', () => {
      expect(html).toContain('title="Google Tag Manager"')
    })
  })

  // Every new FFC site starts here, before workflow 505/503 provisions its
  // container. Emitting a snippet with an empty id would request `ns.html?id=`
  // and `gtm.js?id=`, which fails in the browser — so the components must
  // render nothing at all rather than an empty tag.
  // `GoogleTagManager` wraps next/script, which renders NOTHING through
  // renderToString outside a Next runtime — measured: it returns '' even for a
  // fully configured id. So `expect(renderToString(<GoogleTagManager …/>)).toBe('')`
  // is vacuously true and cannot fail. The component function is called
  // directly instead, where its `return null` guard is observable.
  describe('when no container is configured', () => {
    it('renders nothing for an empty id', () => {
      expect(renderToString(<GoogleTagManagerNoScript gtmId="" />)).toBe('')
      expect(GoogleTagManager({ gtmId: '' })).toBeNull()
      expect(GoogleTagManagerNoScript({ gtmId: '' })).toBeNull()
    })

    // A whitespace-only id is unconfigured too. It passes a bare truthiness
    // check, so without an explicit trim the components emit
    // `ns.html?id=%20%20` and `gtm.js?id=%20%20`, which fail in the browser
    // exactly like an empty id would — but silently, since a tag IS rendered.
    it('renders nothing for a whitespace-only id', () => {
      expect(renderToString(<GoogleTagManagerNoScript gtmId="   " />)).toBe('')
      expect(GoogleTagManager({ gtmId: '   ' })).toBeNull()
      expect(GoogleTagManagerNoScript({ gtmId: '   ' })).toBeNull()
    })

    it('still renders for a real id (so the checks above are not vacuous)', () => {
      expect(GoogleTagManager({ gtmId: TEST_GTM_ID })).not.toBeNull()
      expect(GoogleTagManagerNoScript({ gtmId: TEST_GTM_ID })).not.toBeNull()
    })

    it('trims a padded id rather than emitting it verbatim', () => {
      const html = renderToString(<GoogleTagManagerNoScript gtmId={`  ${TEST_GTM_ID}  `} />)
      expect(html).toContain(`id=${TEST_GTM_ID}`)
      expect(html).not.toContain('%20')
    })
  })

  describe('the shipped configuration', () => {
    it('never carries a container id this site does not own', () => {
      // Either unset (awaiting provisioning) or a well-formed GTM container.
      expect(GTM_ID.trim() === '' || /^GTM-[A-Z0-9]+$/.test(GTM_ID.trim())).toBe(true)
    })

    it('matches the id actually rendered by default', () => {
      const defaultHtml = renderToString(<GoogleTagManagerNoScript />)
      if (GTM_ID.trim() === '') {
        expect(defaultHtml).toBe('')
      } else {
        expect(defaultHtml).toContain(GTM_ID.trim())
      }
    })
  })
})
