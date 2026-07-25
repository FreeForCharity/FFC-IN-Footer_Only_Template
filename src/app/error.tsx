'use client'

import React, { useEffect } from 'react'
import Link from 'next/link'
import { siteConfig } from '@/lib/site.config'

// Route-segment error boundary. Next.js renders this instead of its own
// unstyled default when a render below the root layout throws, so visitors
// keep the site chrome (footer, cookie consent) and a way out.
//
// Deliberately does NOT surface `error.message` or `error.stack`. In a
// production build Next already replaces the message with a generic string and
// exposes only `error.digest` — an opaque hash that maps back to the server
// log. Rendering the message anyway would leak internals from any error thrown
// client-side, where no such redaction happens. The digest is safe to show and
// is the only thing a visitor can usefully quote back to us.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Local/dev diagnostics only — never in the production bundle's output.
    if (process.env.NODE_ENV !== 'production') {
      console.error('Unhandled render error:', error)
    }
  }, [error])

  return (
    <main id="main-content" className="pt-[130px] pb-[54px]">
      <div className="py-[27px] w-[90%] md:w-[80%] mx-auto">
        <div className="border-t-[5px] border-[#b91c1c] pt-[25px]" id="lato-font">
          <p className="text-[14px] font-[700] tracking-[2px] text-[#b91c1c] uppercase mb-[10px]">
            Something went wrong
          </p>
          <h1 className="text-[30px] leading-[34px] font-[700] text-[#333] mt-[20px] mb-[25px]">
            We hit an unexpected error
          </h1>
          <p className="mb-[20px] pb-[10px] text-[14px] font-[500] leading-[25px] text-[#666]">
            This page did not load correctly. The problem is on our side, not yours. You can try
            again, or return to the {siteConfig.name} home page.
          </p>

          <div className="flex flex-wrap items-center gap-[16px] mb-[30px]">
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center justify-center bg-[#0073e6] hover:bg-[#005BB7] text-white px-[24px] py-[12px] text-[14px] font-[700] transition-colors"
            >
              Try again
            </button>
            <Link
              href="/"
              className="inline-flex items-center justify-center border border-[#0073e6] text-[#0073e6] hover:bg-[#0073e6] hover:text-white px-[24px] py-[12px] text-[14px] font-[700] transition-colors"
            >
              Go to the home page
            </Link>
          </div>

          <div className="bg-[#f9f9f9] border-l-[5px] border-[#cccccc] p-[20px] mt-[30px] mb-[30px]">
            <p className="mb-[10px] text-[14px] font-[500] leading-[25px] text-[#666]">
              If it keeps happening, please tell us. Report it through our{' '}
              <Link
                href={siteConfig.vulnerabilityDisclosurePath}
                className="text-[#005BB7] font-[700] underline decoration-dotted hover:decoration-solid transition-all"
              >
                Vulnerability Disclosure Policy
              </Link>{' '}
              contact route, or email{' '}
              <a
                href={`mailto:${siteConfig.contactEmail}`}
                className="text-[#005BB7] font-[700] underline decoration-dotted hover:decoration-solid transition-all"
              >
                {siteConfig.contactEmail}
              </a>
              .
            </p>
            {error.digest ? (
              <p className="text-[13px] font-[500] leading-[22px] text-[#888]">
                Reference ID: <code>{error.digest}</code>
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  )
}
