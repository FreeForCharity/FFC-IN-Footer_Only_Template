import React from 'react'
import { PENDING_TEXT, isPending, mailtoHref, siteConfig } from '@/lib/site.config'

/**
 * The organization's contact email as a `mailto:` link, for prose on the
 * policy and error pages.
 *
 * While the email is still awaiting the charity (listed in
 * `siteConfig.pending`) `contactEmail` is empty, and a bare link would render
 * as an empty `mailto:` with no text: nothing to read, nothing to send to, and
 * an unnamed link to a screen reader. The visible "awaiting information" text
 * is shown instead, as plain text and never a link, matching the footer. An
 * empty email that is not pending is a config error (the site.config tests
 * reject it); it renders nothing rather than an empty link.
 */
export default function ContactEmail({ className }: { className: string }) {
  if (siteConfig.contactEmail.trim()) {
    return (
      <a href={mailtoHref()} className={className}>
        {siteConfig.contactEmail}
      </a>
    )
  }
  return isPending('email') ? <em>{PENDING_TEXT}</em> : null
}
