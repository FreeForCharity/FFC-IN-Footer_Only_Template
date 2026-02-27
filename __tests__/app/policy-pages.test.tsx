import React from 'react'
import { render, screen } from '@testing-library/react'

// Import page components and their metadata exports
import DonationPolicyPage, { metadata as donationMeta } from '../../src/app/donation-policy/page'
import SecurityAckPage, {
  metadata as securityMeta,
} from '../../src/app/security-acknowledgements/page'
import CookiePolicyPage, { metadata as cookieMeta } from '../../src/app/cookie-policy/page'
import TermsPage, { metadata as termsMeta } from '../../src/app/terms-of-service/page'
import PrivacyPage, { metadata as privacyMeta } from '../../src/app/privacy-policy/page'
import VulnDisclosurePage, {
  metadata as vulnMeta,
} from '../../src/app/vulnerability-disclosure-policy/page'

const pages = [
  { name: 'Donation Policy', Component: DonationPolicyPage, meta: donationMeta },
  { name: 'Security Acknowledgements', Component: SecurityAckPage, meta: securityMeta },
  { name: 'Cookie Policy', Component: CookiePolicyPage, meta: cookieMeta },
  { name: 'Terms of Service', Component: TermsPage, meta: termsMeta },
  { name: 'Privacy Policy', Component: PrivacyPage, meta: privacyMeta },
  { name: 'Vulnerability Disclosure Policy', Component: VulnDisclosurePage, meta: vulnMeta },
]

describe('Policy page metadata', () => {
  it.each(pages)('$name should export a title', ({ meta }) => {
    expect(meta.title).toBeDefined()
    expect(typeof meta.title).toBe('string')
    expect((meta.title as string).length).toBeGreaterThan(0)
  })

  it.each(pages)('$name should export a description', ({ meta }) => {
    expect(meta.description).toBeDefined()
    expect(typeof meta.description).toBe('string')
    expect((meta.description as string).length).toBeGreaterThan(0)
  })

  it.each(pages)('$name title should contain Free For Charity', ({ meta }) => {
    expect(meta.title).toContain('Free For Charity')
  })
})

describe('Policy page rendering', () => {
  it('Donation Policy renders heading and EIN', () => {
    render(<DonationPolicyPage />)
    expect(screen.getByText('Donation Policy')).toBeInTheDocument()
    expect(screen.getByText(/46-2471893/)).toBeInTheDocument()
  })

  it('Donation Policy contains expected sections', () => {
    render(<DonationPolicyPage />)
    expect(screen.getByText('Tax Deductibility')).toBeInTheDocument()
    expect(screen.getByText('Use of Donations')).toBeInTheDocument()
    expect(screen.getByText('Refund Policy')).toBeInTheDocument()
  })

  it('Donation Policy has a contact email link', () => {
    render(<DonationPolicyPage />)
    const emailLink = screen.getByText('clarkemoyer@freeforcharity.org')
    expect(emailLink.closest('a')).toHaveAttribute('href', 'mailto:clarkemoyer@freeforcharity.org')
  })

  it('Security Acknowledgements renders heading', () => {
    render(<SecurityAckPage />)
    expect(screen.getByText('Security Acknowledgements')).toBeInTheDocument()
  })

  it('Security Acknowledgements links to vulnerability disclosure policy', () => {
    render(<SecurityAckPage />)
    const link = screen.getByText('Vulnerability Disclosure Policy')
    expect(link.closest('a')).toHaveAttribute('href', '/vulnerability-disclosure-policy')
  })

  it('Cookie Policy renders heading', () => {
    render(<CookiePolicyPage />)
    expect(screen.getByText('Cookie Policy')).toBeInTheDocument()
  })

  it('Terms of Service renders heading', () => {
    render(<TermsPage />)
    expect(screen.getByRole('heading', { name: /Terms of Service/ })).toBeInTheDocument()
  })

  it('Privacy Policy renders heading', () => {
    render(<PrivacyPage />)
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument()
  })

  it('Vulnerability Disclosure Policy renders heading', () => {
    render(<VulnDisclosurePage />)
    expect(
      screen.getByRole('heading', { name: /Vulnerability Disclosure Policy/ })
    ).toBeInTheDocument()
  })
})
