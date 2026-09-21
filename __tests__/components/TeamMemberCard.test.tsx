import React from 'react'
import { render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import TeamMemberCard, {
  memberInitials,
  safeLinkedInUrl,
} from '../../src/components/ui/TeamMemberCard'

expect.extend(toHaveNoViolations)

const defaultProps = {
  name: 'Clarke Moyer',
  role: 'Free For Charity Founder/ President of the Board',
  linkedinUrl: 'https://www.linkedin.com/in/clarkemoyer/',
}

describe('safeLinkedInUrl', () => {
  it('accepts https LinkedIn URLs (including subdomains)', () => {
    expect(safeLinkedInUrl('https://www.linkedin.com/in/janedoe')).toBe(
      'https://www.linkedin.com/in/janedoe'
    )
    expect(safeLinkedInUrl('https://linkedin.com/in/x')).toBe('https://linkedin.com/in/x')
    expect(safeLinkedInUrl('https://uk.linkedin.com/in/x')).toBe('https://uk.linkedin.com/in/x')
  })
  it('normalizes the returned URL (trims surrounding whitespace)', () => {
    expect(safeLinkedInUrl('  https://www.linkedin.com/in/x  ')).toBe(
      'https://www.linkedin.com/in/x'
    )
  })
  it('rejects non-https schemes and off-site or malformed hosts', () => {
    expect(safeLinkedInUrl('javascript:alert(1)')).toBeUndefined()
    expect(safeLinkedInUrl('http://www.linkedin.com/in/x')).toBeUndefined()
    expect(safeLinkedInUrl('https://evil.com/in/x')).toBeUndefined()
    expect(safeLinkedInUrl('https://notlinkedin.com/in/x')).toBeUndefined()
    expect(safeLinkedInUrl('not a url')).toBeUndefined()
    expect(safeLinkedInUrl(undefined)).toBeUndefined()
  })
})

describe('memberInitials', () => {
  it('takes the first + last initial and upper-cases them', () => {
    expect(memberInitials('Jane Doe')).toBe('JD')
    expect(memberInitials('clarke moyer')).toBe('CM')
  })
  it('handles a single-word name', () => {
    expect(memberInitials('Cher')).toBe('C')
  })
  it('ignores middle names and extra whitespace', () => {
    expect(memberInitials('  Mary  Anne   Smith ')).toBe('MS')
  })
  it('degrades to a placeholder for an empty name', () => {
    expect(memberInitials('   ')).toBe('?')
  })
})

describe('TeamMemberCard component', () => {
  it('should render the member name', () => {
    render(<TeamMemberCard {...defaultProps} />)
    expect(screen.getByText('Clarke Moyer')).toBeInTheDocument()
  })

  it('should render the member role', () => {
    render(<TeamMemberCard {...defaultProps} />)
    expect(screen.getByText('Free For Charity Founder/ President of the Board')).toBeInTheDocument()
  })

  it('should render an initials monogram instead of a photo', () => {
    render(<TeamMemberCard {...defaultProps} />)
    expect(screen.getByText('CM')).toBeInTheDocument()
    // No portrait image should be requested for a team member.
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('should link the whole card to LinkedIn in a new tab with safe rel attributes', () => {
    render(<TeamMemberCard {...defaultProps} />)
    const link = screen.getByRole('link', { name: /Clarke Moyer on LinkedIn/i })
    expect(link).toHaveAttribute('href', defaultProps.linkedinUrl)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  it('should render no link when linkedinUrl is omitted', () => {
    render(<TeamMemberCard name="No Link" role="Volunteer" />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'No Link' })).toBeInTheDocument()
  })

  it('should render no link for an unsafe (non-https / off-site) linkedinUrl', () => {
    render(<TeamMemberCard name="Bad Link" role="Advisor" linkedinUrl="javascript:alert(1)" />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Bad Link' })).toBeInTheDocument()
  })

  it('should not have accessibility violations', async () => {
    const { container } = render(<TeamMemberCard {...defaultProps} />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
