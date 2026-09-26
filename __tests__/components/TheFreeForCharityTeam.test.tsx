import React from 'react'
import { siteConfig } from '../../src/lib/site.config'
import { render, screen } from '@testing-library/react'

import TheFreeForCharityTeam from '../../src/components/home-page/TheFreeForCharityTeam'
import { team } from '../../src/data/team'

describe('TheFreeForCharityTeam component', () => {
  it('should render without crashing', () => {
    render(<TheFreeForCharityTeam />)
  })

  it('should display the team heading', () => {
    render(<TheFreeForCharityTeam />)
    expect(screen.getByText(`The ${siteConfig.name} Team`)).toBeInTheDocument()
  })

  it('should render a card per member with initials monograms and no photos', () => {
    const { container } = render(<TheFreeForCharityTeam />)
    // One heading per configured member -- the roster size is per-charity
    // content, so it is read from the data rather than pinned to a number.
    const names = screen.getAllByRole('heading', { level: 3 })
    expect(names).toHaveLength(team.length)
    // No portrait images anywhere in the team section.
    expect(container.querySelectorAll('img')).toHaveLength(0)
  })

  it('should display every configured member with their role', () => {
    render(<TheFreeForCharityTeam />)
    for (const member of team) {
      expect(screen.getByText(member.name)).toBeInTheDocument()
      expect(screen.getByText(member.role)).toBeInTheDocument()
    }
  })

  it('should have the team section with id="team"', () => {
    const { container } = render(<TheFreeForCharityTeam />)
    expect(container.querySelector('#team')).toBeInTheDocument()
  })
})

describe('TheFreeForCharityTeam with an empty roster', () => {
  beforeEach(() => {
    jest.resetModules()
  })

  it('renders nothing when the team array is empty', () => {
    jest.isolateModules(() => {
      jest.doMock('@/data/team', () => ({ team: [] }))
      const EmptyTeam = require('../../src/components/home-page/TheFreeForCharityTeam').default
      const { container } = render(<EmptyTeam />)
      expect(container.firstChild).toBeNull()
    })
  })
})
