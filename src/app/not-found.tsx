import React from 'react'
import Link from 'next/link'
import type { Metadata } from 'next'
import { siteConfig } from '@/lib/site.config'

// Rendered by Next.js for any unmatched route. With `output: 'export'` this
// becomes out/404.html, which GitHub Pages serves for unknown paths — so the
// branded page replaces the framework default on the real deploy, not just in
// `next dev`.
//
// Title is intentionally the bare page name: the root layout's metadata
// template (`%s | <site name>`) appends the charity name for us.
export const metadata: Metadata = {
  title: 'Page Not Found',
  description: `The page you requested could not be found on ${siteConfig.name}.`,
  robots: { index: false, follow: false },
}

export default function NotFound() {
  return (
    <main id="main-content" className="pt-[130px] pb-[54px]">
      <div className="py-[27px] w-[90%] md:w-[80%] mx-auto">
        <div className="lato-font border-t-[5px] border-[#0073e6] pt-[25px]">
          <p className="text-[14px] font-[700] tracking-[2px] text-[#0073e6] uppercase mb-[10px]">
            Error 404
          </p>
          <h1 className="text-[30px] leading-[34px] font-[700] text-[#333] mt-[20px] mb-[25px]">
            We can&apos;t find that page
          </h1>
          <p className="mb-[20px] pb-[10px] text-[14px] font-[500] leading-[25px] text-[#666]">
            The link you followed may be broken, or the page may have been moved or renamed. Nothing
            is wrong with your browser and no action is needed on your side.
          </p>
          <p className="mb-[30px] text-[14px] font-[500] leading-[25px] text-[#666]">
            Head back to the {siteConfig.name} home page to keep exploring, or use one of the links
            below.
          </p>

          <ul className="list-disc pl-[40px] pb-[23px] leading-[26px] mb-[30px] space-y-[10px] text-[14px]">
            <li className="text-[#666] font-[500]">
              <Link
                href="/"
                className="text-[#005BB7] font-[700] underline decoration-dotted hover:decoration-solid transition-all"
              >
                Home page
              </Link>
            </li>
            <li className="text-[#666] font-[500]">
              <Link
                href="/privacy-policy"
                className="text-[#005BB7] font-[700] underline decoration-dotted hover:decoration-solid transition-all"
              >
                Privacy Policy
              </Link>
            </li>
            <li className="text-[#666] font-[500]">
              <Link
                href="/terms-of-service"
                className="text-[#005BB7] font-[700] underline decoration-dotted hover:decoration-solid transition-all"
              >
                Terms of Service
              </Link>
            </li>
          </ul>

          <div className="bg-[#f9f9f9] border-l-[5px] border-[#cccccc] p-[20px] mt-[30px] mb-[30px]">
            <p className="text-[14px] font-[500] leading-[25px] text-[#666]">
              Think this page should exist? Let us know through our{' '}
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
          </div>
        </div>
      </div>
    </main>
  )
}
