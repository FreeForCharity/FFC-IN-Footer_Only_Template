import React from 'react'
import { render } from '@testing-library/react'

import PrivacyPage from '../../src/app/privacy-policy/page'
import CookiePolicyPage from '../../src/app/cookie-policy/page'
import TermsPage from '../../src/app/terms-of-service/page'
import VulnDisclosurePage from '../../src/app/vulnerability-disclosure-policy/page'
import SecurityAckPage from '../../src/app/security-acknowledgements/page'
import FfcDonationPolicyPage from '../../src/app/free-for-charity-donation-policy/page'
import { siteConfig } from '../../src/lib/site.config'

/**
 * The policy pages a site publishes as its OWN must be about that site's
 * organization, and must route enquiries to it.
 *
 * The template ships these documents pre-written with Free For Charity's
 * identity in the BODY text, not just in metadata, so a rebranded charity site
 * served a privacy policy naming a different organization as the data
 * controller, a Terms of Service governing someone else's services, and a
 * vulnerability disclosure policy scoped to someone else's domains. Nothing
 * caught it: `check:rebrand` reads config and a few known files, and the
 * metadata tests only read `title`/`description`.
 *
 * Assertions are written against `siteConfig`, never against a blacklist of the
 * template author's literals. The blacklist form looks equivalent and is not:
 * on Free For Charity's own deployment those literals are the CORRECT contact
 * details, so it fails the template while still passing a fork that merely
 * swapped in a different wrong address.
 */

const charityOwnedPolicies = [
  { name: 'Privacy Policy', Component: PrivacyPage },
  { name: 'Cookie Policy', Component: CookiePolicyPage },
  { name: 'Terms of Service', Component: TermsPage },
  { name: 'Vulnerability Disclosure Policy', Component: VulnDisclosurePage },
  { name: 'Security Acknowledgements', Component: SecurityAckPage },
]

/** True when this site IS the supporting organization (i.e. the template itself). */
const isSupporterSite = siteConfig.name === siteConfig.supportedBy.name

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g

/**
 * Every email address rendered anywhere in a subtree.
 *
 * Scans one text node at a time rather than `container.textContent`, which
 * concatenates adjacent elements with no separator: an address ending a link
 * runs straight into the next element's first word, and the TLD pattern
 * swallows it — `rlee@codex.stanford.edu` + `Main Address` reads as
 * `rlee@codex.stanford.eduMain`, so a correct page fails.
 */
function renderedEmails(container: HTMLElement): Set<string> {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  const found = new Set<string>()

  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    for (const match of node.textContent?.match(EMAIL_RE) ?? []) found.add(match)
  }
  for (const link of Array.from(container.querySelectorAll('a[href^="mailto:"]'))) {
    found.add((link.getAttribute('href') ?? '').replace(/^mailto:/, ''))
  }
  return found
}

describe('policies this site publishes as its own', () => {
  it.each(charityOwnedPolicies)(
    '$name shows no email address but this organization’s',
    ({ Component }) => {
      const { container } = render(<Component />)

      for (const email of renderedEmails(container)) {
        expect(email).toBe(siteConfig.contactEmail)
      }
    }
  )

  it.each(charityOwnedPolicies)('$name names this organization', ({ Component }) => {
    const { container } = render(<Component />)
    expect(container.textContent).toContain(siteConfig.name)
  })

  // Naming the organization somewhere is not enough: these documents state a
  // SUBJECT ("X is committed to…", "provided by X"), and a rebrand that leaves
  // the subject as the template author still publishes someone else's policy
  // under this organization's banner. Reintroducing exactly that passed an
  // earlier version of this suite, which only checked contacts and a mention.
  //
  // The Cookie Policy is absent by design: it is written wholly in the first
  // person and states no organizational subject in its body.
  const subjectStatements = [
    {
      name: 'Privacy Policy',
      Component: PrivacyPage,
      phrase: `At ${siteConfig.name}, accessible from`,
    },
    { name: 'Terms of Service', Component: TermsPage, phrase: `provided by ${siteConfig.name}` },
    {
      name: 'Vulnerability Disclosure Policy',
      Component: VulnDisclosurePage,
      phrase: `${siteConfig.name} is committed to ensuring the security`,
    },
    {
      name: 'Security Acknowledgements',
      Component: SecurityAckPage,
      phrase: `${siteConfig.name} would like to extend`,
    },
  ]

  it.each(subjectStatements)(
    '$name states this organization as its subject',
    ({ Component, phrase }) => {
      const { container } = render(<Component />)
      const text = (container.textContent ?? '').replace(/\s+/g, ' ')

      expect(text).toContain(phrase)

      // The supporting organization must not be the subject instead. Skipped
      // when this site IS that organization, where the two names are the same
      // string and the assertion would contradict the one above.
      if (!isSupporterSite) {
        expect(text).not.toContain(
          `${siteConfig.supportedBy.name} is committed to ensuring the security`
        )
        expect(text).not.toContain(`provided by ${siteConfig.supportedBy.name} (`)
      }
    }
  )

  it('routes privacy enquiries to this organization', () => {
    const { container } = render(<PrivacyPage />)
    const mailtos = Array.from(container.querySelectorAll('a[href^="mailto:"]')).map((a) =>
      a.getAttribute('href')
    )

    expect(mailtos.length).toBeGreaterThan(0)
    for (const href of mailtos) {
      expect(href).toBe(`mailto:${siteConfig.contactEmail}`)
    }
  })

  it('routes vulnerability reports to this organization', () => {
    const { container } = render(<VulnDisclosurePage />)
    const mailtos = Array.from(container.querySelectorAll('a[href^="mailto:"]')).map((a) =>
      a.getAttribute('href')
    )

    expect(mailtos.length).toBeGreaterThan(0)
    for (const href of mailtos) {
      expect(href).toBe(`mailto:${siteConfig.contactEmail}`)
    }
  })

  // An organization with no published phone number must not have one invented
  // for it anywhere in its policies — the same rule the footer follows.
  it('publishes a phone number in its policies only when one is configured', () => {
    const configured = siteConfig.phone.tel.trim() !== '' && siteConfig.phone.display.trim() !== ''

    for (const { Component } of charityOwnedPolicies) {
      const { container } = render(<Component />)
      const telLinks = Array.from(container.querySelectorAll('a[href^="tel:"], a[href^="sms:"]'))

      if (configured) {
        for (const link of telLinks) {
          expect(link.getAttribute('href')).toContain(siteConfig.phone.tel.trim())
        }
      } else {
        expect(telLinks).toHaveLength(0)
      }
    }
  })
})

// The supporting-organization relationship is a material fact about how a
// supported site is operated, and the privacy policy is where a visitor looks
// for it. On the supporting organization's own site there is no third party to
// disclose, and the section correctly renders nothing.
describe('the supporting-organization disclosure', () => {
  const label = isSupporterSite
    ? 'is omitted on the supporter’s own site'
    : 'states the arrangement and its limits'

  it(label, () => {
    const { container } = render(<PrivacyPage />)
    const text = container.textContent ?? ''

    if (isSupporterSite) {
      expect(text).not.toContain('participates in the free website program run by')
      return
    }

    expect(text).toContain(siteConfig.supportedBy.name)
    expect(text).toContain('participates in the free website program run by')
    // The three things the disclosure has to answer.
    expect(text).toMatch(/responsible for/i)
    expect(text).toMatch(/cannot delete an individual entry/i)
    expect(text).toMatch(/do not sell or rent personal information/i)

    const links = Array.from(container.querySelectorAll('a')).filter(
      (a) => a.getAttribute('href') === siteConfig.supportedBy.url
    )
    expect(links.length).toBeGreaterThan(0)
  })
})

// Free For Charity's own donation policy is published on a supported site on
// purpose and correctly keeps FFC's identity. Asserting that stops an
// over-zealous future rebrand from "fixing" it.
describe("the supporting organization's own donation policy", () => {
  it('keeps Free For Charity as its subject', () => {
    const { container } = render(<FfcDonationPolicyPage />)
    expect(container.textContent).toContain('Free For Charity')
  })
})
