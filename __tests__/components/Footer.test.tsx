import React from 'react'
import { render, screen, within } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import Footer from '../../src/components/footer'
import RootPage from '../../src/app/page'
import { routes } from '../../src/app/sitemap'
import { siteConfig } from '../../src/lib/site.config'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

// Every charity-specific expectation is read from src/lib/site.config.ts, the
// documented single customization point. Pinning this charity's own name, EIN,
// email or addresses here would make a correct rebrand fail — the exact
// contradiction `npm run check:rebrand` is meant to prevent.
describe('Footer component', () => {
  it('should render the footer', () => {
    render(<Footer />)
    const footer = screen.getByRole('contentinfo')
    expect(footer).toBeInTheDocument()
  })

  it('should display Endorsements section', () => {
    render(<Footer />)
    expect(screen.getByText('Endorsements')).toBeInTheDocument()
  })

  it('should display Quick Links section', () => {
    render(<Footer />)
    expect(screen.getByText('Quick Links')).toBeInTheDocument()
  })

  it('should display Contact Us section with contact information', () => {
    render(<Footer />)
    expect(screen.getByText('Contact Us')).toBeInTheDocument()
  })

  it('should have social media links', () => {
    render(<Footer />)
    const links = screen.getAllByRole('link')
    expect(links.length).toBeGreaterThan(0)
  })

  it('should display the current year in copyright', () => {
    render(<Footer />)
    const currentYear = new Date().getFullYear()
    expect(screen.getByText(new RegExp(currentYear.toString()))).toBeInTheDocument()
  })

  it('should have GuideStar profile link', () => {
    render(<Footer />)
    expect(screen.getByLabelText(`View ${siteConfig.name} GuideStar Profile`)).toHaveAttribute(
      'href',
      siteConfig.guidestar.profileUrl
    )
    expect(screen.getByText('Direct GuideStar Profile Link').closest('a')).toHaveAttribute(
      'href',
      siteConfig.guidestar.directProfileUrl
    )
  })

  it('should have email contact link', () => {
    render(<Footer />)
    const emailLink = screen.getByText(siteConfig.contactEmail).closest('a')
    expect(emailLink).toHaveAttribute('href', `mailto:${siteConfig.contactEmail}`)
  })

  it('should display the EIN number', () => {
    render(<Footer />)
    expect(screen.getByText(new RegExp(siteConfig.ein))).toBeInTheDocument()
  })

  // A charity with no published phone number must render NO phone block at all.
  // The alternative the template used to allow — a placeholder in the config —
  // ships a `tel:` link that dials nothing, which is worse than an absent one
  // because it looks callable.
  // Every combination is exercised by varying the config, not just whichever
  // one this fork happens to ship. Reading the fork's own value only tests the
  // branch it is already in, so the case that matters most here — a `tel` set
  // with no `display`, which renders a link with no accessible name — would go
  // untested on every site that has a complete phone number.
  describe('the phone block', () => {
    const original = { ...siteConfig.phone }
    afterEach(() => {
      siteConfig.phone = original
    })

    const absent = [
      ['both empty', { display: '', tel: '' }],
      ['tel only', { display: '', tel: '5551234567' }],
      ['display only', { display: '(555) 123-4567', tel: '' }],
      ['whitespace only', { display: '   ', tel: '   ' }],
    ] as const

    it.each(absent)('is not rendered when %s', (_label, phone) => {
      siteConfig.phone = { ...phone }
      render(<Footer />)

      expect(screen.queryByText('Call Us Today')).not.toBeInTheDocument()
      expect(document.querySelector('a[href^="tel:"]')).toBeNull()
    })

    it('is rendered, and dialable, when both fields are set', () => {
      siteConfig.phone = { display: '(555) 123-4567', tel: '5551234567' }
      render(<Footer />)

      expect(screen.getByText('Call Us Today')).toBeInTheDocument()
      expect(screen.getByText('(555) 123-4567').closest('a')).toHaveAttribute(
        'href',
        'tel:5551234567'
      )
    })

    it('trims a padded number rather than dialing the padding', () => {
      siteConfig.phone = { display: '(555) 123-4567', tel: '  5551234567  ' }
      render(<Footer />)

      expect(screen.getByText('(555) 123-4567').closest('a')).toHaveAttribute(
        'href',
        'tel:5551234567'
      )
    })
  })

  it('should display the charity policy section', () => {
    render(<Footer />)
    expect(screen.getByText(`${siteConfig.name} Policy`)).toBeInTheDocument()
  })

  it('should have all social media links with correct aria-labels', () => {
    render(<Footer />)
    // Only links with a non-empty href are rendered (an empty href disables one).
    for (const { label, href } of siteConfig.social.filter((link) => link.href)) {
      const link = screen.getByLabelText(label)
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', href)
    }
  })

  // A fork may disable every social link -- an empty href is the documented
  // "off" state -- and that is a correct configuration, not a failure. Requiring
  // a first enabled link made such a fork fail here. Checking EVERY enabled link
  // rather than just the first also means a footer that opens one of several in
  // the same tab is caught.
  it('opens every enabled social link in a new tab, and renders none when all are disabled', () => {
    render(<Footer />)
    const enabled = siteConfig.social.filter((link) => link.href.trim())

    if (enabled.length === 0) {
      expect(screen.queryAllByRole('link', { name: /facebook|twitter|linkedin|github/i })).toEqual(
        []
      )
      return
    }

    for (const { label } of enabled) {
      const link = screen.getByLabelText(label)
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    }
  })

  it('should have policy links with correct hrefs', () => {
    render(<Footer />)
    const policyLinks = [
      // FFC's own donation policy: label hardcoded to FFC on purpose, since it
      // describes FFC's policy and not this charity's.
      { text: 'Free For Charity Donation Policy', href: '/free-for-charity-donation-policy' },
      // The charity's own donation policy: fixed label, no name interpolation.
      { text: 'Donation Policy', href: '/donation-policy' },
      { text: `${siteConfig.name} Privacy Policy`, href: '/privacy-policy' },
      { text: `${siteConfig.name} Cookie Policy`, href: '/cookie-policy' },
      { text: `${siteConfig.name} Terms of Service`, href: '/terms-of-service' },
      {
        text: `${siteConfig.name} Vulnerability Disclosure Policy`,
        href: '/vulnerability-disclosure-policy',
      },
      { text: `${siteConfig.name} Security Acknowledgement`, href: '/security-acknowledgements' },
    ]

    for (const { text, href } of policyLinks) {
      const link = screen.getByText(text).closest('a')
      expect(link).toHaveAttribute('href', href)
    }
  })

  // The template shipped quick links pointing at homepage anchors (/#mission,
  // /#programs, /#donate …) that a footer-only fork has no sections for, so
  // every one rendered as a working link to nothing. Asserting the LABELS froze
  // that bug in place; asserting that each destination actually exists is what
  // catches it, and it keeps holding after a fork rewrites the list.
  it('points every quick link at a route this site actually serves', () => {
    render(<Footer />)

    const quickLinksList = screen.getByText('Quick Links').parentElement!.querySelector('ul')!
    const links = within(quickLinksList).getAllByRole('link')
    expect(links.length).toBeGreaterThan(0)

    const servedPaths = new Set(routes.map((route) => route.path))

    // Anchor targets have to be resolved against the page that actually renders
    // them, not just accepted because the path before the '#' exists. Checking
    // only the path is what let the template's dead `/#mission` links look
    // valid: they all resolve to '/', which is always a real route.
    const { container: homeContainer } = render(<RootPage />)
    const homeIds = new Set(Array.from(homeContainer.querySelectorAll('[id]')).map((el) => el.id))

    for (const link of links) {
      const href = link.getAttribute('href')!
      // The Donate / Volunteer fallbacks email the charity. A mailto is not a
      // route, but it must at least address the configured contact email.
      if (href.startsWith('mailto:')) {
        expect(href.startsWith(`mailto:${siteConfig.contactEmail}?subject=`)).toBe(true)
        continue
      }
      if (href.startsWith('http')) {
        expect(href).toMatch(/^https:\/\//)
        expect(link).toHaveAttribute('target', '_blank')
        expect(link).toHaveAttribute('rel', 'noopener noreferrer')
        continue
      }

      const [path, fragment] = href.split('#')
      const normalized = path === '' ? '/' : path.replace(/\/$/, '') || '/'
      expect(servedPaths).toContain(normalized)

      if (fragment === undefined) continue

      expect(fragment.length).toBeGreaterThan(0)
      // Only the home page is rendered here, so an anchor into any other route
      // cannot be verified and is therefore not allowed in the quick links.
      expect(normalized).toBe('/')
      expect(homeIds).toContain(fragment)
    }
  })

  it('states the charity name and one-sentence mission on every page', () => {
    render(<Footer />)
    const footer = screen.getByRole('contentinfo')
    expect(within(footer).getByText(siteConfig.mission)).toBeInTheDocument()
    expect(siteConfig.mission.trim().length).toBeGreaterThan(0)
  })

  // Donate and Volunteer are always rendered: a configured https page when
  // there is one, otherwise an email to the charity. Exercised by varying the
  // config so both branches are tested whatever this fork ships.
  describe.each([
    ['Donate', 'donationUrl'],
    ['Volunteer', 'volunteerUrl'],
  ] as const)('the %s quick link', (label, key) => {
    const original = siteConfig[key]
    afterEach(() => {
      siteConfig[key] = original
    })

    const linkFor = () =>
      within(screen.getByText('Quick Links').parentElement!.querySelector('ul')!).getByRole(
        'link',
        { name: label }
      )

    it('points at the configured https page, opening in a new tab', () => {
      siteConfig[key] = 'https://example.org/give-or-help'
      render(<Footer />)
      expect(linkFor()).toHaveAttribute('href', 'https://example.org/give-or-help')
      expect(linkFor()).toHaveAttribute('target', '_blank')
      expect(linkFor()).toHaveAttribute('rel', 'noopener noreferrer')
    })

    it.each([
      ['empty', ''],
      ['whitespace', '   '],
      ['not https', 'http://example.org/give'],
      ['a script URL', 'javascript:alert(1)'],
    ])('falls back to emailing the charity when the URL is %s', (_case, value) => {
      siteConfig[key] = value
      render(<Footer />)
      const href = linkFor().getAttribute('href')!
      expect(href.startsWith(`mailto:${siteConfig.contactEmail}?subject=`)).toBe(true)
      expect(linkFor()).not.toHaveAttribute('target')
    })
  })

  it('always renders the FFC hub login link', () => {
    render(<Footer />)
    // FFC footer standard: always rendered, points at siteConfig.supportedBy.hubUrl.
    const hubLink = screen.getByText('Supported Charity Login').closest('a')
    expect(hubLink).toHaveAttribute('href', siteConfig.supportedBy.hubUrl)
    expect(hubLink).toHaveAttribute('target', '_blank')
    expect(hubLink).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('should have GuideStar image with alt text', () => {
    render(<Footer />)
    expect(screen.getByAltText('GuideStar Platinum Seal of Transparency')).toBeInTheDocument()
  })

  it('should have Google Maps links for addresses', () => {
    render(<Footer />)
    // The address links have no aria-label (WCAG 2.5.3 label-in-name: the
    // visible text is the accessible name, with sr-only "(opens in Google
    // Maps)" context appended), so query them by their visible label text.
    for (const address of siteConfig.addresses) {
      const link = screen.getByText(address.label).closest('a')
      expect(link).toHaveAttribute('href', address.mapUrl)
      for (const line of address.lines) {
        expect(link).toHaveTextContent(line)
      }
    }
  })

  it('should display the permanent "Supported by Free For Charity" attribution in copyright bar', () => {
    render(<Footer />)
    const copyright = screen.getByText((_, node) => {
      return (
        node?.tagName.toLowerCase() === 'p' && node.textContent?.includes('All Rights Are Reserved')
      )
    })
    // FFC footer standard: the attribution is always rendered and links to FFC.
    // These values are intentionally literal — the standard forbids a fork from
    // removing or repointing them.
    expect(copyright).toHaveTextContent('Supported by Free For Charity')
    // Scoped to the copyright bar: the footer's mission line also shows the
    // charity name, which on FFC's own site is "Free For Charity" too.
    const link = within(copyright).getByText('Free For Charity')
    expect(link.closest('a')).toHaveAttribute('href', 'https://freeforcharity.org')
  })

  it('should not have accessibility violations', async () => {
    const { container } = render(<Footer />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
