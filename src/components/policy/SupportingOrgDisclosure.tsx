import React from 'react'
import { siteConfig } from '@/lib/site.config'
import { GTM_ID } from '@/lib/analytics.config'

/**
 * How this website is provided, and what that means for a visitor's data.
 *
 * Every FFC-supported charity site is a static export served by infrastructure
 * the charity does not itself operate. That arrangement is invisible to a
 * visitor reading a privacy policy, and it materially changes two things a
 * privacy policy is supposed to answer: who to contact, and what the operator
 * can actually do about a request. Stating it is the honest position, and it
 * scopes the commitments the rest of the policy makes.
 *
 * Config-driven so it stays correct on every fork: the charity's name and the
 * supporting organization both come from `src/lib/site.config.ts`, and the
 * analytics paragraph reflects whether a container is actually configured
 * rather than asserting a fixed answer.
 */
export default function SupportingOrgDisclosure() {
  const supporter = siteConfig.supportedBy.name

  // The supporting organization's OWN site is the one place this section makes
  // no sense: it would read "Free For Charity participates in the free website
  // program run by Free For Charity". That organization operates its own
  // infrastructure, so there is no third party to disclose and no split in
  // responsibility to explain. Render nothing rather than a self-referential
  // paragraph — which is exactly what this template itself renders.
  if (siteConfig.name === supporter) return null

  const analyticsEnabled = GTM_ID.trim() !== ''

  const p = 'text-[14px] text-[#666] pb-[10px] leading-[24px] font-[500]'
  const li = 'text-[14px] text-[#666] leading-[24px] font-[500]'

  return (
    <div>
      <p className={p}>
        {siteConfig.name} participates in the free website program run by{' '}
        <a
          href={siteConfig.supportedBy.url}
          className="text-[#0062cc] underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {supporter}
        </a>
        , a US 501(c)(3) nonprofit that provides websites, domain management and related
        infrastructure to charitable organizations at no cost. This site is built from a template{' '}
        {supporter} maintains and is published as a set of static files — there is no application
        server, database or user account system behind it.
      </p>

      <p className={p}>
        We are setting this out because it changes what we can and cannot do with your data, and a
        privacy policy that did not mention it would overstate our control.
      </p>

      <p className="text-[14px] text-[#333] pb-[6px] leading-[24px] font-[700]">
        What {siteConfig.name} is responsible for
      </p>
      <ul className="list-disc pl-[20px] space-y-[6px] pb-[10px]">
        <li className={li}>
          The content of this website, and the decisions about what it publishes and collects.
        </li>
        <li className={li}>
          Answering you about your personal data. Requests described in this policy come to{' '}
          {siteConfig.name} at the address in the Contact section — not to {supporter}. If a request
          reaches {supporter} first, they pass it to us.
        </li>
      </ul>

      <p className="text-[14px] text-[#333] pb-[6px] leading-[24px] font-[700]">
        What {supporter} and its providers handle on our behalf
      </p>
      <ul className="list-disc pl-[20px] space-y-[6px] pb-[10px]">
        <li className={li}>
          <strong>Hosting and delivery.</strong> The site&apos;s files are served by third-party
          hosting and content-delivery infrastructure arranged by {supporter}. Like any web server,
          those providers record the requests they serve — typically IP address, timestamp, the page
          requested, and browser user-agent — as part of operating and securing the service.
        </li>
        <li className={li}>
          <strong>Domain and network security.</strong> DNS and the protective proxy in front of the
          site are managed by {supporter}, which includes filtering abusive traffic.
        </li>
        <li className={li}>
          {analyticsEnabled ? (
            <>
              <strong>Analytics.</strong> Aggregate website analytics are collected through a tag
              manager provisioned for this site, and only after you consent — see our Cookie Policy.
              Declining leaves the tags unloaded.
            </>
          ) : (
            <>
              <strong>Analytics.</strong> No analytics or advertising tag is currently configured
              for this site, so none is loaded. If that changes, it will be consent-gated as
              described in our Cookie Policy, and this policy will be updated first.
            </>
          )}
        </li>
      </ul>

      <p className="text-[14px] text-[#333] pb-[6px] leading-[24px] font-[700]">
        The limits of what we can do
      </p>
      <ul className="list-disc pl-[20px] space-y-[6px] pb-[10px]">
        <li className={li}>
          Server and security logs held by the hosting, DNS and CDN providers are kept under those
          providers&apos; own retention schedules. {siteConfig.name} does not receive them as
          identifiable records and cannot delete an individual entry from them on request.
        </li>
        <li className={li}>
          Where we cannot act on a request ourselves, we will tell you so plainly, explain who holds
          the data, and help you direct the request to them. We will not let a request go unanswered
          on the grounds that a provider holds the data.
        </li>
        <li className={li}>
          We do not sell or rent personal information, and neither {supporter} nor its providers are
          permitted to use data from this site for their own marketing.
        </li>
      </ul>

      <p className={p}>
        {supporter}&apos;s own policies govern its separate services, including the supporter and
        volunteer accounts on its hub. Those are linked in the footer of this site and are distinct
        from this policy, which covers {siteConfig.name} and this website only.
      </p>
    </div>
  )
}
