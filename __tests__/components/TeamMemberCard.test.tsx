import React from 'react'
import { render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import TeamMemberCard from '../../src/components/ui/TeamMemberCard'

expect.extend(toHaveNoViolations)

const defaultProps = {
  imageUrl: '/Images/member1.webp',
  name: 'Clarke Moyer',
  title: 'Free For Charity Founder/ President of the Board',
  linkedinUrl: 'https://www.linkedin.com/in/clarkemoyer/',
}

describe('TeamMemberCard component', () => {
  it('should render the member name', () => {
    render(<TeamMemberCard {...defaultProps} />)
    expect(screen.getByText('Clarke Moyer')).toBeInTheDocument()
  })

  it('should render the member title', () => {
    render(<TeamMemberCard {...defaultProps} />)
    expect(screen.getByText('Free For Charity Founder/ President of the Board')).toBeInTheDocument()
  })

  it('should render the member photo with correct alt text', () => {
    render(<TeamMemberCard {...defaultProps} />)
    const img = screen.getByAltText('Clarke Moyer')
    expect(img).toBeInTheDocument()
  })

  it('should render a LinkedIn link', () => {
    render(<TeamMemberCard {...defaultProps} />)
    const links = screen.getAllByRole('link')
    const linkedinLink = links.find(
      (link) => link.getAttribute('href') === 'https://www.linkedin.com/in/clarkemoyer/'
    )
    expect(linkedinLink).toBeDefined()
  })

  it('should open LinkedIn link in a new tab', () => {
    render(<TeamMemberCard {...defaultProps} />)
    const links = screen.getAllByRole('link')
    const linkedinLink = links.find(
      (link) => link.getAttribute('href') === 'https://www.linkedin.com/in/clarkemoyer/'
    )
    expect(linkedinLink).toHaveAttribute('target', '_blank')
    expect(linkedinLink).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('should render the LinkedIn icon with alt text', () => {
    render(<TeamMemberCard {...defaultProps} />)
    expect(screen.getByAltText('linkedin icon')).toBeInTheDocument()
  })

  it('should not have accessibility violations', async () => {
    const { container } = render(<TeamMemberCard {...defaultProps} />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
