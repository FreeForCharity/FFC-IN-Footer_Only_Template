import React from 'react'
import { render, screen } from '@testing-library/react'

// Mock TeamMemberCard to isolate the component under test
jest.mock('../../src/components/ui/TeamMemberCard', () => {
  return function MockTeamMemberCard({
    name,
    title,
    imageUrl,
    linkedinUrl,
  }: {
    name: string
    title: string
    imageUrl: string
    linkedinUrl: string
  }) {
    return (
      <div data-testid="team-member-card">
        <span data-testid="member-name">{name}</span>
        <span data-testid="member-title">{title}</span>
        <span data-testid="member-image">{imageUrl}</span>
        <a href={linkedinUrl}>LinkedIn</a>
      </div>
    )
  }
})

import TheFreeForCharityTeam from '../../src/components/home-page/TheFreeForCharityTeam'

describe('TheFreeForCharityTeam component', () => {
  it('should render without crashing', () => {
    render(<TheFreeForCharityTeam />)
  })

  it('should display the team heading', () => {
    render(<TheFreeForCharityTeam />)
    expect(screen.getByText('The Free For Charity Team')).toBeInTheDocument()
  })

  it('should render all 5 team members', () => {
    render(<TheFreeForCharityTeam />)
    const cards = screen.getAllByTestId('team-member-card')
    expect(cards).toHaveLength(5)
  })

  it('should display Clarke Moyer as Founder', () => {
    render(<TheFreeForCharityTeam />)
    expect(screen.getByText('Clarke Moyer')).toBeInTheDocument()
    expect(screen.getByText('Free For Charity Founder/ President of the Board')).toBeInTheDocument()
  })

  it('should display all team member names', () => {
    render(<TheFreeForCharityTeam />)
    const expectedNames = [
      'Clarke Moyer',
      'Chris Rae',
      'Tyler Carlotto',
      'Brennan Darling',
      'Rebecca Cook',
    ]
    for (const name of expectedNames) {
      expect(screen.getByText(name)).toBeInTheDocument()
    }
  })

  it('should have the team section with id="team"', () => {
    const { container } = render(<TheFreeForCharityTeam />)
    expect(container.querySelector('#team')).toBeInTheDocument()
  })
})
