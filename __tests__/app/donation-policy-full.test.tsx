import React from 'react'
import { render, screen } from '@testing-library/react'
import DonationPolicyPage, { metadata } from '../../src/app/free-for-charity-donation-policy/page'

describe('Free For Charity Donation Policy page', () => {
  it('should export metadata with a title', () => {
    expect(metadata.title).toBeDefined()
    expect(metadata.title).toContain('Free For Charity')
  })

  it('should export metadata with a description', () => {
    expect(metadata.description).toBeDefined()
    expect(typeof metadata.description).toBe('string')
  })

  it('should render without crashing', () => {
    render(<DonationPolicyPage />)
  })

  it('should display the main heading', () => {
    render(<DonationPolicyPage />)
    const headings = screen.getAllByText('Free For Charity Donation Policy')
    expect(headings.length).toBeGreaterThan(0)
  })

  it('should display the Introduction section', () => {
    render(<DonationPolicyPage />)
    expect(screen.getByText('Introduction')).toBeInTheDocument()
  })

  it('should display all major section headings', () => {
    render(<DonationPolicyPage />)
    const sections = [
      'Scope and Purpose',
      'Types of Acceptable Donations',
      'Donor Responsibilities',
      'Evaluation and Acceptance of Donations',
      'Donor Acknowledgment and Recognition',
      'Confidentiality and Privacy',
      'Conflict of Interest',
      'Policy Review and Updates',
      'Conclusion',
    ]
    for (const section of sections) {
      expect(screen.getByText(section)).toBeInTheDocument()
    }
  })

  it('should display donation type subsections', () => {
    render(<DonationPolicyPage />)
    expect(screen.getByText('1. Cash Donations')).toBeInTheDocument()
    expect(screen.getByText('2. Securities')).toBeInTheDocument()
    expect(screen.getByText('3. Real Estate')).toBeInTheDocument()
    expect(screen.getByText('4. Personal Property')).toBeInTheDocument()
    expect(screen.getByText('5. In-Kind Contributions')).toBeInTheDocument()
  })

  it('should have a contact email link', () => {
    render(<DonationPolicyPage />)
    const emailLink = screen.getByText('clarkemoyer@freeforcharity.org')
    expect(emailLink.closest('a')).toHaveAttribute('href', 'mailto:clarkemoyer@freeforcharity.org')
  })

  it('should display the effective date', () => {
    render(<DonationPolicyPage />)
    expect(screen.getByText(/Effective Date: 11-20-2024/)).toBeInTheDocument()
  })
})
