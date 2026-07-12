export type SiteSocialLink = {
  label: string
  href: string
}

export type SiteLink = {
  label: string
  href: string
}

export type SiteAddress = {
  label: string
  lines: readonly string[]
  mapHref: string
  mapAriaLabel: string
}

export type SiteConfig = {
  name: string
  tagline: string
  description: string
  shortDescription: string
  url: string
  twitterHandle: string
  contactEmail: string
  ein: string
  guideStar: {
    profileHref: string
    profileAriaLabel: string
    sharedProfileHref: string
    sharedProfileLabel: string
    sealAlt: string
  }
  phone: {
    label: string
    display: string
    href: string
  }
  addresses: readonly SiteAddress[]
  /**
   * Permanent "Supported by" attribution to the supporting organization (FFC),
   * rendered in the footer bottom bar. Part of the FFC footer standard: always
   * rendered and NOT to be removed or repointed when customizing a fork.
   */
  supportedBy: {
    name: string
    url: string
  }
  keywords: readonly string[]
  themeColor: string
  vulnerabilityDisclosurePath: string
  social: readonly SiteSocialLink[]
  quickLinks: readonly SiteLink[]
  policyHeading: string
  policyLinks: readonly SiteLink[]
}

export const siteConfig: SiteConfig = {
  name: 'Free For Charity',
  tagline: 'Reduce Costs, Increase Impact',
  description:
    'Free For Charity connects students, professionals, and businesses with nonprofits to reduce costs and increase revenues—putting more resources back into their missions.',
  shortDescription:
    'Connecting students, professionals, and businesses with nonprofits to reduce costs and increase revenues.',
  url: 'https://ffcworkingsite1.org',
  twitterHandle: '@freeforcharity',
  contactEmail: 'clarkemoyer@freeforcharity.org',
  ein: '46-2471893',
  guideStar: {
    profileHref: 'https://www.guidestar.org/profile/46-2471893',
    profileAriaLabel: 'View Free For Charity GuideStar Profile',
    sharedProfileHref:
      'https://www.guidestar.org/profile/shared/bbbe173a-87b9-4af9-a8a2-cae255a95742',
    sharedProfileLabel: 'Direct GuideStar Profile Link',
    sealAlt: 'GuideStar Platinum Seal of Transparency',
  },
  phone: {
    label: 'Call Us Today',
    display: '(520) 222-8104',
    href: 'tel:5202228104',
  },
  addresses: [
    {
      label: 'Main Address',
      lines: ['4030 Wake Forrest Road', 'Suite 349 Raleigh North', 'Carolina 27609'],
      mapHref:
        'https://www.google.com/maps/search/?api=1&query=4030+Wake+Forrest+Road+Suite+349+Raleigh+NC+27609',
      mapAriaLabel: 'Open main address in Google Maps',
    },
    {
      label: 'PA Office Address',
      lines: ['301 Science Park Road Suite', '119 State College PA 16803'],
      mapHref:
        'https://www.google.com/maps/place/Free+For+Charity/@40.7768455,-77.8963305,17z/data=!3m1!4b1!4m6!3m5!1s0x89cea944b44a2e01:0x6fc2d6bf09e00a0f!8m2!3d40.7768415!4d-77.8937556!16s%2Fg%2F11vzvbl2d7?entry=ttu&g_ep=EgoyMDI1MTEyMy4xIKXMDSoASAFQAw%3D%3D',
      mapAriaLabel: 'Open PA office address in Google Maps',
    },
  ],
  supportedBy: {
    name: 'Free For Charity',
    url: 'https://freeforcharity.org',
  },
  keywords: [
    'nonprofit',
    'charity',
    'volunteer',
    'donate',
    'free hosting',
    'domains',
    'Microsoft 365',
  ],
  themeColor: '#ffffff',
  vulnerabilityDisclosurePath: '/vulnerability-disclosure-policy',
  social: [
    { label: 'Facebook', href: 'https://www.facebook.com/freeforcharity' },
    { label: 'X (Twitter)', href: 'https://x.com/freeforcharity1' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/company/freeforcharity/' },
    // Repo name uses underscores — the hyphenated variant 404s.
    { label: 'GitHub', href: 'https://github.com/FreeForCharity/FFC-IN-Footer_Only_Template' },
  ],
  quickLinks: [
    { label: 'Home (Placeholder)', href: '/#hero' },
    { label: 'Mission (Placeholder)', href: '/#mission' },
    { label: 'Programs (Placeholder)', href: '/#programs' },
    { label: 'Events (Placeholder)', href: '/#events' },
    { label: 'Donate (Placeholder)', href: '/#donate' },
    { label: 'Volunteer (Placeholder)', href: '/#volunteer' },
    { label: 'FAQ (Placeholder)', href: '/#faq' },
    { label: 'Team (Placeholder)', href: '/#team' },
    { label: 'Supported Charity Login', href: 'https://freeforcharity.org/hub/' },
  ],
  policyHeading: 'Free For Charity Policy',
  policyLinks: [
    {
      label: 'Free For Charity Donation Policy',
      href: '/free-for-charity-donation-policy',
    },
    {
      label: 'Free For Charity Privacy Policy',
      href: '/privacy-policy',
    },
    {
      label: 'Free For Charity Cookie Policy',
      href: '/cookie-policy',
    },
    {
      label: 'Free For Charity Terms of Service',
      href: '/terms-of-service',
    },
    {
      label: 'Free For Charity Vulnerability Disclosure Policy',
      href: '/vulnerability-disclosure-policy',
    },
    {
      label: 'Free For Charity Security Acknowledgement',
      href: '/security-acknowledgements',
    },
  ],
}

function configuredBasePath(): string {
  const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() ?? ''

  if (!rawBasePath || rawBasePath === '/') {
    return ''
  }

  const basePath = rawBasePath.startsWith('/') ? rawBasePath : `/${rawBasePath}`

  return basePath.replace(/\/+$/, '')
}

function assertSameOriginPath(path: string): void {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) {
    throw new TypeError(
      `siteUrl: path must be a same-origin absolute path starting with a single "/" (got: ${JSON.stringify(path)})`
    )
  }
}

export function sitePath(path = '/'): string {
  assertSameOriginPath(path)

  const basePath = configuredBasePath()

  if (!basePath) {
    return path
  }

  if (path === '/') {
    return `${basePath}/`
  }

  return `${basePath}${path}`
}

export function siteUrl(path = '/'): string {
  assertSameOriginPath(path)

  return `${siteConfig.url.replace(/\/$/, '')}${sitePath(path)}`
}

export function twitterSite(): string | undefined {
  const handle = siteConfig.twitterHandle.trim().replace(/^@+/, '')
  return handle ? `@${handle}` : undefined
}

export function cardDescription(): string {
  return siteConfig.shortDescription.trim() || siteConfig.description
}
