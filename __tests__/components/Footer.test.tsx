import React from 'react'
import { render, screen, within } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import Footer from '../../src/components/footer'
import RootPage from '../../src/app/page'
import { routes } from '../../src/app/sitemap'
import { PENDING_TEXT, isPending, type PendingField, siteConfig } from '../../src/lib/site.config'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

// Every charity-specific expectation is read from src/lib/site.config.ts, the
// documented single customization point. Pinning this charity's own name, EIN,
// email or addresses here would make a correct rebrand fail — the exact
// contradiction `npm run check:rebrand` is meant to prevent.
// Tests of this site's own shipped values skip when that field is pending in
// a fork: a pending field is empty and shows a placeholder instead (covered by
// 'pending footer fields' below, which varies the config itself).
const itUnlessPending = (field: PendingField) => (isPending(field) ? it.skip : it)
// These two preconditions MIRROR the component's own render conditions in
// src/components/footer/index.tsx: the seal needs both the profile URL and the
// site's own sealUrl, while the direct-link button needs only its own URL. They
// are separate transparency claims, so they get separate gates — a single gate
// over both fields runs a seal case on a config that has no seal.
//
// Keeping them in step with the component is not cosmetic. #172 added sealUrl
// to the component's condition and not to this gate, which left the gate
// satisfied by a config the component renders no seal for: a provisioned
// charity site gets a derived profileUrl and an intentionally EMPTY sealUrl
// (never another organization's seal), so both cases below ran and both failed
// on a correct site. The template's own config sets all three, so the template
// stayed green and the breakage appeared only downstream, in
// FreeForCharity/FFC-Cloudflare-Automation's 748 provisioning matrix.
const hasSeal = Boolean(
  siteConfig.guidestar.profileUrl.trim() && siteConfig.guidestar.sealUrl.trim()
)
const hasDirectLink = Boolean(siteConfig.guidestar.directProfileUrl.trim())
const itWithSeal = hasSeal ? it : it.skip
const itWithDirectLink = hasDirectLink ? it : it.skip

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

  itWithSeal('should link the shipped Candid seal to the shipped profile', () => {
    render(<Footer />)
    const sealLink = screen.getByLabelText(`${siteConfig.name} Candid Seal of Transparency`)
    expect(sealLink).toHaveAttribute('href', siteConfig.guidestar.profileUrl)
    expect(
      within(sealLink).getByRole('img', { name: 'Candid Seal of Transparency' })
    ).toHaveAttribute('src', siteConfig.guidestar.sealUrl)
  })

  itWithDirectLink('should have the shipped direct Candid profile link', () => {
    render(<Footer />)
    expect(screen.getByText('Direct Candid Profile Link').closest('a')).toHaveAttribute(
      'href',
      siteConfig.guidestar.directProfileUrl
    )
  })

  // Unconditional on purpose: this is what holds `hasSeal` to the component.
  // Both cases above skip themselves when the shipped config has no seal, so a
  // gate that drifts from the component again goes quiet rather than red —
  // which is how #172 shipped. This case cannot skip, so a gate that disagrees
  // with the component fails it whichever way the disagreement runs.
  it('renders the seal exactly when the shipped config configures one', () => {
    render(<Footer />)
    expect(Boolean(screen.queryByAltText('Candid Seal of Transparency'))).toBe(hasSeal)
  })

  itUnlessPending('email')('should have email contact link', () => {
    render(<Footer />)
    const emailLink = screen.getByText(siteConfig.contactEmail).closest('a')
    expect(emailLink).toHaveAttribute('href', `mailto:${siteConfig.contactEmail}`)
  })

  itUnlessPending('ein')('should display the EIN number', () => {
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
    const originalPending = siteConfig.pending
    // These cases cover a phone that is NOT pending: empty means "no phone".
    beforeEach(() => {
      siteConfig.pending = (originalPending ?? []).filter((f) => f !== 'phone')
    })
    afterEach(() => {
      siteConfig.phone = original
      siteConfig.pending = originalPending
    })

    it('shows a non-dialable placeholder while the phone is pending', () => {
      siteConfig.phone = { display: '', tel: '' }
      siteConfig.pending = ['phone']
      render(<Footer />)

      expect(screen.getByText('Call Us Today')).toBeInTheDocument()
      expect(screen.getByText(PENDING_TEXT).closest('a')).toBeNull()
      expect(document.querySelector('a[href^="tel:"]')).toBeNull()
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

  // RFC 6068: '?', '#', '&' and '%' in the address would end it early and let
  // a malformed contactEmail inject headers ahead of the subject.
  it('percent-encodes URI-reserved characters in the fallback address', () => {
    const originalEmail = siteConfig.contactEmail
    const originalUrl = siteConfig.donationUrl
    try {
      siteConfig.contactEmail = 'give?bcc=x@example.org#frag'
      siteConfig.donationUrl = ''
      render(<Footer />)
      const href = within(screen.getByText('Quick Links').parentElement!.querySelector('ul')!)
        .getByRole('link', { name: 'Donate' })
        .getAttribute('href')!
      expect(href.startsWith('mailto:give%3Fbcc=x@example.org%23frag?subject=')).toBe(true)
      expect(href.match(/\?/g)).toHaveLength(1)
    } finally {
      siteConfig.contactEmail = originalEmail
      siteConfig.donationUrl = originalUrl
    }
  })

  it('renders the tax-status clause only when one is configured', () => {
    const original = siteConfig.taxStatusLabel
    try {
      siteConfig.taxStatusLabel = ''
      render(<Footer />)
      expect(screen.getByRole('contentinfo').textContent).not.toMatch(/501c3/)
    } finally {
      siteConfig.taxStatusLabel = original
    }
  })

  it('percent-encodes a comma so a malformed contactEmail cannot add a recipient', () => {
    const original = siteConfig.contactEmail
    const originalPending = siteConfig.pending
    try {
      siteConfig.contactEmail = 'a@example.org,evil@example.com'
      // A configured email is not pending, whatever this site ships with.
      siteConfig.pending = (originalPending ?? []).filter((f) => f !== 'email')
      render(<Footer />)
      const contact = screen.getByText('a@example.org,evil@example.com').closest('a')!
      expect(contact.getAttribute('href')).toBe('mailto:a@example.org%2Cevil@example.com')
    } finally {
      siteConfig.contactEmail = original
      siteConfig.pending = originalPending
    }
  })

  it('always renders the FFC hub login link', () => {
    render(<Footer />)
    // FFC footer standard: always rendered, points at siteConfig.supportedBy.hubUrl.
    const hubLink = screen.getByText('Supported Charity Login').closest('a')
    expect(hubLink).toHaveAttribute('href', siteConfig.supportedBy.hubUrl)
    expect(hubLink).toHaveAttribute('target', '_blank')
    expect(hubLink).toHaveAttribute('rel', 'noopener noreferrer')
  })

  itWithSeal('should have the Candid seal image with alt text', () => {
    render(<Footer />)
    expect(screen.getByAltText('Candid Seal of Transparency')).toBeInTheDocument()
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

// The `pending` convention (see PendingField in src/lib/site.config.ts): a
// footer-standard field the charity has not supplied yet keeps an EMPTY value
// and renders PENDING_TEXT in its slot as plain text, never a link. The
// template itself lists nothing pending, so these cases set the config
// themselves and restore it afterwards, covering both states on every site.
describe('pending footer fields', () => {
  const original = {
    contactEmail: siteConfig.contactEmail,
    phone: siteConfig.phone,
    addresses: siteConfig.addresses,
    ein: siteConfig.ein,
    guidestar: siteConfig.guidestar,
    social: siteConfig.social,
    donationUrl: siteConfig.donationUrl,
    volunteerUrl: siteConfig.volunteerUrl,
    pending: siteConfig.pending,
  }
  afterEach(() => {
    Object.assign(siteConfig, original)
  })

  // Every footer slot. 'team' is not a footer field: it belongs to the team
  // section (see TheFreeForCharityTeam.test.tsx).
  const footerFields: readonly PendingField[] = [
    'guidestar',
    'ein',
    'donationUrl',
    'volunteerUrl',
    'email',
    'phone',
    'address',
    'social',
  ]

  function makeEveryFooterFieldPending() {
    siteConfig.contactEmail = ''
    siteConfig.phone = { display: '', tel: '' }
    siteConfig.addresses = []
    siteConfig.ein = ''
    siteConfig.guidestar = { sealUrl: '', profileUrl: '', directProfileUrl: '' }
    siteConfig.social = siteConfig.social.map((link) => ({ ...link, href: '' }))
    siteConfig.donationUrl = ''
    siteConfig.volunteerUrl = ''
    siteConfig.pending = [...footerFields]
  }

  it('renders one non-link placeholder per pending footer field in the shipped config', () => {
    render(<Footer />)
    const pendingInFooter = (siteConfig.pending ?? []).filter((f) => f !== 'team')
    const notes = screen.queryAllByText(PENDING_TEXT)
    expect(notes).toHaveLength(pendingInFooter.length)
    for (const note of notes) expect(note.closest('a')).toBeNull()
  })

  it('renders a visible, non-link placeholder for each pending footer field', () => {
    makeEveryFooterFieldPending()
    render(<Footer />)

    const notes = screen.getAllByText(PENDING_TEXT)
    expect(notes).toHaveLength(footerFields.length)
    for (const note of notes) expect(note.closest('a')).toBeNull()

    // Each placeholder sits under its own slot heading.
    for (const heading of [
      'GuideStar / Candid Profile',
      'E-mail',
      'Call Us Today',
      'Address',
      'Social Media',
    ]) {
      expect(screen.getByText(heading)).toBeInTheDocument()
    }
    expect(screen.getByText(`${siteConfig.name} EIN:`, { exact: false })).toBeInTheDocument()

    // Nothing that looks actionable survives behind a placeholder.
    expect(screen.queryByAltText('Candid Seal of Transparency')).toBeNull()
    expect(screen.queryByText('Direct Candid Profile Link')).toBeNull()
    expect(document.querySelector('a[href^="tel:"]')).toBeNull()
    expect(document.querySelector('a[href*="google.com/maps"]')).toBeNull()
    expect(document.querySelector('a[href="mailto:"]')).toBeNull()
  })

  it('shows a Donate / Volunteer placeholder beside the link only while that URL is pending', () => {
    siteConfig.donationUrl = ''
    siteConfig.volunteerUrl = ''
    siteConfig.pending = ['donationUrl']
    render(<Footer />)

    const quickLinks = screen.getByText('Quick Links').parentElement!.querySelector('ul')!
    const donateItem = within(quickLinks).getByRole('link', { name: 'Donate' }).closest('li')!
    const volunteerItem = within(quickLinks).getByRole('link', { name: 'Volunteer' }).closest('li')!
    expect(within(donateItem).getByText(PENDING_TEXT).closest('a')).toBeNull()
    expect(within(volunteerItem).queryByText(PENDING_TEXT)).toBeNull()
  })

  it('treats an empty field that is NOT pending as "the charity has none"', () => {
    siteConfig.phone = { display: '', tel: '' }
    siteConfig.addresses = []
    siteConfig.guidestar = { sealUrl: '', profileUrl: '', directProfileUrl: '' }
    siteConfig.pending = []
    render(<Footer />)

    expect(screen.queryByText(PENDING_TEXT)).toBeNull()
    expect(screen.queryByText('Call Us Today')).toBeNull()
    expect(screen.queryByText('GuideStar / Candid Profile')).toBeNull()
  })

  it('has no accessibility violations with every footer field pending', async () => {
    makeEveryFooterFieldPending()
    const { container } = render(<Footer />)
    expect(await axe(container)).toHaveNoViolations()
  })

  // The seal and the direct-link button are separate transparency claims, so
  // each is gated on its own URL, and neither renders when both are empty.
  describe('GuideStar elements', () => {
    const seal = () => screen.queryByAltText('Candid Seal of Transparency')
    const directLink = () => screen.queryByText('Direct Candid Profile Link')

    it.each([
      ['both URLs', 'https://example.org/seal', 'https://example.org/direct', true, true],
      ['only the profile URL', 'https://example.org/seal', '', true, false],
      ['only the direct URL', '', 'https://example.org/direct', false, true],
      ['neither URL', '', '', false, false],
      ['whitespace-only URLs', '   ', '   ', false, false],
    ])('with %s configured', (_case, profileUrl, directProfileUrl, showSeal, showLink) => {
      siteConfig.guidestar = {
        sealUrl: 'https://example.org/seal.svg',
        profileUrl,
        directProfileUrl,
      }
      siteConfig.pending = []
      render(<Footer />)

      expect(Boolean(seal())).toBe(showSeal)
      expect(Boolean(directLink())).toBe(showLink)
      if (showSeal) expect(seal()!.closest('a')).toHaveAttribute('href', profileUrl)
      if (showLink) expect(directLink()!.closest('a')).toHaveAttribute('href', directProfileUrl)
    })

    // A fork that fills in the profile links but not its own seal URL must not
    // render an <img> with an empty src: the seal stays hidden, the link shows.
    it('hides the seal when the profile URL is set but the seal URL is empty', () => {
      siteConfig.guidestar = {
        sealUrl: '',
        profileUrl: 'https://example.org/profile',
        directProfileUrl: 'https://example.org/direct',
      }
      siteConfig.pending = []
      render(<Footer />)

      expect(seal()).toBeNull()
      expect(screen.queryByRole('img', { name: 'Candid Seal of Transparency' })).toBeNull()
      expect(directLink()!.closest('a')).toHaveAttribute('href', 'https://example.org/direct')
    })

    it('shows the placeholder, and no seal or link, while GuideStar is pending', () => {
      siteConfig.guidestar = { sealUrl: '', profileUrl: '', directProfileUrl: '' }
      siteConfig.pending = ['guidestar']
      render(<Footer />)

      expect(screen.getByText('GuideStar / Candid Profile')).toBeInTheDocument()
      expect(screen.getByText(PENDING_TEXT).closest('a')).toBeNull()
      expect(seal()).toBeNull()
      expect(directLink()).toBeNull()
    })
  })
})
