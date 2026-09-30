import React from 'react'
import { render, screen } from '@testing-library/react'

// Mock TeamMemberCard since TheFreeForCharityTeam uses it
jest.mock('../../src/components/ui/TeamMemberCard', () => {
  return function MockTeamMemberCard({
    name,
    role,
  }: {
    name: string
    role: string
    linkedinUrl?: string
  }) {
    return (
      <div data-testid="team-member-card">
        <span>{name}</span>
        <span>{role}</span>
      </div>
    )
  }
})

import HomePage from '../../src/app/home-page'
import { PENDING_TEXT, isPending } from '../../src/lib/site.config'

describe('HomePage (app/home-page)', () => {
  it('should render without crashing', () => {
    render(<HomePage />)
  })

  it('should render TheFreeForCharityTeam component', () => {
    render(<HomePage />)
    // A roster the charity has not supplied yet renders a placeholder instead.
    if (isPending('team')) expect(screen.getByText(PENDING_TEXT)).toBeInTheDocument()
    else expect(screen.getAllByTestId('team-member-card').length).toBeGreaterThan(0)
  })
})
