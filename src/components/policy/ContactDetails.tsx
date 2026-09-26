import React from 'react'
import { mailtoHref, siteConfig, siteUrl } from '@/lib/site.config'

/**
 * The organization's own contact details, for use in policy pages.
 *
 * Read from `src/lib/site.config.ts` rather than written into each policy.
 * Before this existed, every policy page carried the template author's own
 * email, phone and address as literals, so a rebranded charity site told data
 * subjects to send privacy requests to a different organization entirely.
 *
 * The phone row follows the same rule as the footer: rendered only when BOTH
 * `tel` and `display` are set, since a charity that publishes no number should
 * show no number rather than a link that dials nothing.
 */
export default function ContactDetails({ heading }: { heading?: string }) {
  const tel = siteConfig.phone.tel.trim()
  const display = siteConfig.phone.display.trim()

  return (
    <div>
      {heading && (
        <p className="text-[14px] text-[#333] pb-[6px] leading-[24px] font-[700]">{heading}</p>
      )}
      <ul className="list-disc pl-[20px] space-y-[6px]">
        <li className="text-[14px] text-[#666] leading-[24px] font-[500]">
          <strong>Organization:</strong> {siteConfig.name}
        </li>
        <li className="text-[14px] text-[#666] leading-[24px] font-[500]">
          <strong>Email:</strong>{' '}
          <a href={mailtoHref()} className="text-[#0062cc] underline">
            {siteConfig.contactEmail}
          </a>
        </li>
        {tel && display && (
          <li className="text-[14px] text-[#666] leading-[24px] font-[500]">
            <strong>Phone:</strong>{' '}
            <a href={`tel:${tel}`} className="text-[#0062cc] underline">
              {display}
            </a>
          </li>
        )}
        {siteConfig.addresses.map((address) => (
          <li key={address.label} className="text-[14px] text-[#666] leading-[24px] font-[500]">
            <strong>{address.label}:</strong> {address.lines.join(', ')}
          </li>
        ))}
        <li className="text-[14px] text-[#666] leading-[24px] font-[500]">
          <strong>Website:</strong>{' '}
          {/*
            siteUrl(), not siteConfig.url: the latter is the ORIGIN alone, so on
            a GitHub Pages project-path deploy it points at the domain root
            rather than at this site.
          */}
          <a href={siteUrl('/')} className="text-[#0062cc] underline">
            {siteUrl('/')}
          </a>
        </li>
      </ul>
    </div>
  )
}
