'use client'

import Script from 'next/script'
import { GTM_ID } from '@/lib/analytics.config'

// The container id lives in `src/lib/analytics.config.ts`, NOT here.
//
// This module is `'use client'`. A server component that imports a non-component
// export from a client module gets a client-reference proxy rather than the
// value, so `GTM_ID.trim()` threw during static export while every unit test
// passed. Keeping the constant in a plain module means both sides read the same
// string. Deliberately not re-exported from here, so that trap cannot come back.

/**
 * Both components take an optional `gtmId` that defaults to GTM_ID above.
 * The prop exists so the test suite can exercise BOTH branches — configured and
 * unconfigured — on any fork. Without it a charity awaiting its container can
 * only ever test the null branch, so the markup these components emit once a
 * container IS provisioned would ship unverified. Production code passes
 * nothing and gets the module constant.
 */
type GoogleTagManagerProps = { gtmId?: string }

export default function GoogleTagManager({ gtmId = GTM_ID }: GoogleTagManagerProps = {}) {
  // Trim first: a whitespace-only id is unconfigured, not configured. Without
  // this it passes the truthiness check and the snippet requests
  // `gtm.js?id=%20%20`, which fails in the browser exactly like an empty id.
  const id = gtmId.trim()
  if (!id) return null
  return (
    <>
      {/* Google Tag Manager Script - loaded with lazyOnload for better performance */}
      <Script
        id="gtm-script"
        strategy="lazyOnload"
        dangerouslySetInnerHTML={{
          __html: `
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${id}');
          `,
        }}
      />
    </>
  )
}

// Export a component for the noscript iframe that goes in the body
export function GoogleTagManagerNoScript({ gtmId = GTM_ID }: GoogleTagManagerProps = {}) {
  const id = gtmId.trim()
  if (!id) return null
  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${id}`}
        height="0"
        width="0"
        style={{ display: 'none', visibility: 'hidden' }}
        title="Google Tag Manager"
      />
    </noscript>
  )
}
