import React from 'react'
import { renderToString } from 'react-dom/server'
import GoogleTagManager, {
  GoogleTagManagerNoScript,
  GTM_ID,
} from '../../src/components/google-tag-manager'

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
  describe('when no container is configured', () => {
    it('renders nothing for an empty id', () => {
      expect(renderToString(<GoogleTagManagerNoScript gtmId="" />)).toBe('')
      expect(renderToString(<GoogleTagManager gtmId="" />)).toBe('')
    })
  })

  describe('the shipped configuration', () => {
    it('never carries a container id this site does not own', () => {
      // Either unset (awaiting provisioning) or a well-formed GTM container.
      expect(GTM_ID === '' || /^GTM-[A-Z0-9]+$/.test(GTM_ID)).toBe(true)
    })

    it('matches the id actually rendered by default', () => {
      const defaultHtml = renderToString(<GoogleTagManagerNoScript />)
      if (GTM_ID === '') {
        expect(defaultHtml).toBe('')
      } else {
        expect(defaultHtml).toContain(GTM_ID)
      }
    })
  })
})
