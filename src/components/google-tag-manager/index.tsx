'use client'

import Script from 'next/script'

// Google Tag Manager ID for THIS site.
//
// A fork MUST replace this with its own container before going live, or the
// charity's visitor analytics are reported into Free For Charity's property.
// `npm run check:rebrand` flags the template's id for exactly that reason.
//
// An EMPTY string is a supported state and means "no container provisioned
// yet" — every new FFC site starts there, waiting on workflows 505/503. Both
// components below then render nothing, rather than emitting a snippet that
// requests `gtm.js?id=` and fails in the browser.
export const GTM_ID: string = 'GTM-TQ5H8HPR'

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
  if (!gtmId) return null
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
            })(window,document,'script','dataLayer','${gtmId}');
          `,
        }}
      />
    </>
  )
}

// Export a component for the noscript iframe that goes in the body
export function GoogleTagManagerNoScript({ gtmId = GTM_ID }: GoogleTagManagerProps = {}) {
  if (!gtmId) return null
  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
        height="0"
        width="0"
        style={{ display: 'none', visibility: 'hidden' }}
        title="Google Tag Manager"
      />
    </noscript>
  )
}
