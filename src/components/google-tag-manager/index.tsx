'use client'

import Script from 'next/script'

import { GTM_ID } from '@/lib/analytics.config'
import { scriptString } from '@/lib/script-string'

// The container id lives in `src/lib/analytics.config.ts`, NOT here.
//
// This module is `'use client'`. A server component that imports a non-component
// export from a client module gets a client-reference proxy rather than the
// value, so `GTM_ID.trim()` threw during static export while every unit test
// passed. Keeping the constant in a plain module means both sides read the same
// string. Deliberately not re-exported from here, so that trap cannot come back.

/**
 * The component takes an optional `gtmId` that defaults to GTM_ID above.
 * The prop exists so the test suite can exercise BOTH branches — configured and
 * unconfigured — on any fork. Without it a charity awaiting its container can
 * only ever test the null branch, so the markup this component emits once a
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
            })(window,document,'script','dataLayer',${scriptString(id)});
          `,
        }}
      />
    </>
  )
}

/*
 * THE <noscript> GTM IFRAME WAS DELETED, NOT UNMOUNTED.
 *
 * It used to live here as `GoogleTagManagerNoScript` and render in <body>.
 * It is gone because it is the one tracking path consent cannot reach: with
 * JavaScript disabled the Consent Mode bootstrap never runs, the cookie
 * banner never renders, and the footer's "Do Not Sell or Share" control does
 * not exist — yet the iframe would still request the GTM container, carrying
 * no consent signal, with no way for a GPC-sending visitor to stop it.
 *
 * That made the privacy policy's claim — that the consent check runs before
 * any Google tag loads — false for every JS-disabled visitor. Deleting the
 * export rather than merely removing the usage is deliberate: an unmounted
 * component is one import away from coming back, and `tests/` asserts the
 * iframe's ABSENCE from the rendered page so that re-adding it fails CI.
 *
 * The scriptString helper that used to be duplicated here is also gone, for
 * a related reason: its local copy carried a comment justifying the
 * duplication as a server-boundary necessity, which was untrue — this file
 * declares 'use client' on line 1. One implementation now lives in
 * src/lib/script-string.ts, so an escaping fix cannot land in one loader and
 * miss the other.
 *
 * KEPT THROUGH THE MERGE WITH `main`, which still carried the component: main
 * moved the container id into analytics.config and added the `gtmId` prop,
 * both of which are kept here. The deletion is not reverted, because the
 * reason for it is unchanged and `tests/` asserts the iframe's absence.
 */
