import React from 'react'
import { renderToString } from 'react-dom/server'
import { GoogleTagManagerNoScript } from '../../src/components/google-tag-manager'

// React suppresses <noscript> children in client-side renders (jsdom).
// We use server-side renderToString to verify the noscript markup.

describe('GoogleTagManagerNoScript component', () => {
  const html = renderToString(<GoogleTagManagerNoScript />)

  it('should render a noscript element', () => {
    expect(html).toContain('<noscript>')
  })

  it('should contain an iframe pointing to GTM', () => {
    expect(html).toContain('googletagmanager.com/ns.html')
    expect(html).toContain('GTM-TQ5H8HPR')
  })

  it('should have the iframe hidden', () => {
    expect(html).toContain('height="0"')
    expect(html).toContain('width="0"')
  })

  it('should have an accessible title on the iframe', () => {
    expect(html).toContain('title="Google Tag Manager"')
  })
})
