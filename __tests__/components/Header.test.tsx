import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import Header from '../../src/components/header'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/'),
}))

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
    nav: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <nav {...props}>{children}</nav>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}))

describe('Header component', () => {
  it('should render the header', () => {
    render(<Header />)
    expect(screen.getByRole('banner')).toBeInTheDocument()
  })

  it('should display the Free For Charity logo', () => {
    render(<Header />)
    expect(screen.getByAltText('Free For Charity')).toBeInTheDocument()
  })

  it('should display Home navigation link', () => {
    render(<Header />)
    expect(screen.getByText('Home')).toBeInTheDocument()
  })

  it('should have navigation links', () => {
    render(<Header />)
    const links = screen.getAllByRole('link')
    expect(links.length).toBeGreaterThan(0)
  })

  it('should have a mobile menu button', () => {
    render(<Header />)
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('should have search functionality button', () => {
    render(<Header />)
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThanOrEqual(2)
  })

  it('should display all expected navigation items', () => {
    render(<Header />)
    const navItems = ['Home', 'Team']
    for (const item of navItems) {
      expect(screen.getAllByText(item).length).toBeGreaterThanOrEqual(1)
    }
  })

  it('should have a search button with correct aria-label', () => {
    render(<Header />)
    expect(screen.getByLabelText('Search')).toBeInTheDocument()
  })

  it('should toggle search input when search button is clicked', () => {
    render(<Header />)
    const searchBtn = screen.getByLabelText('Search')
    fireEvent.click(searchBtn)
    expect(screen.getByLabelText('Search input')).toBeInTheDocument()
  })

  it('should have close search button when search is open', () => {
    render(<Header />)
    fireEvent.click(screen.getByLabelText('Search'))
    expect(screen.getByLabelText('Close search')).toBeInTheDocument()
  })

  it('should close search when close button is clicked', () => {
    render(<Header />)
    fireEvent.click(screen.getByLabelText('Search'))
    expect(screen.getByLabelText('Search input')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Close search'))
    expect(screen.queryByLabelText('Search input')).not.toBeInTheDocument()
  })

  it('should have mobile menu button with correct aria-label', () => {
    render(<Header />)
    expect(screen.getByLabelText('Open menu')).toBeInTheDocument()
  })

  it('should toggle mobile menu open on button click', () => {
    render(<Header />)
    fireEvent.click(screen.getByLabelText('Open menu'))
    expect(screen.getByLabelText('Close menu')).toBeInTheDocument()
  })

  it('should have the logo link to homepage', () => {
    render(<Header />)
    const logo = screen.getByAltText('Free For Charity')
    const logoLink = logo.closest('a')
    expect(logoLink).toHaveAttribute('href', '/')
  })

  it('should not have accessibility violations', async () => {
    const { container } = render(<Header />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('should shrink header on scroll', () => {
    render(<Header />)
    const header = screen.getByRole('banner')
    expect(header.className).toContain('h-[80px]')

    // Simulate scrolling past threshold
    Object.defineProperty(window, 'scrollY', { value: 100, writable: true })
    fireEvent.scroll(window)

    expect(header.className).toContain('h-[55px]')
  })

  it('should close mobile menu when a link is clicked', () => {
    render(<Header />)
    // Open mobile menu
    fireEvent.click(screen.getByLabelText('Open menu'))
    expect(screen.getByLabelText('Close menu')).toBeInTheDocument()

    // Click a nav link inside the mobile menu area
    const homeLinks = screen.getAllByText('Home')
    // Click the last one (mobile menu duplicate)
    fireEvent.click(homeLinks[homeLinks.length - 1])

    // After clicking a link, menu should close (button reverts to Open menu)
    expect(screen.getByLabelText('Open menu')).toBeInTheDocument()
  })

  it('should highlight active section based on scroll spy', () => {
    // Create a mock team section element
    const teamSection = document.createElement('div')
    teamSection.id = 'team'
    Object.defineProperty(teamSection, 'offsetTop', { value: 200, configurable: true })
    Object.defineProperty(teamSection, 'offsetHeight', { value: 500, configurable: true })
    document.body.appendChild(teamSection)

    render(<Header />)

    // Scroll into the team section
    Object.defineProperty(window, 'scrollY', { value: 250, writable: true })
    fireEvent.scroll(window)

    // The Team link should be styled as active (text-blue-600)
    const teamLinks = screen.getAllByText('Team')
    const activeTeamLink = teamLinks.find((link) => link.className.includes('text-blue-600'))
    expect(activeTeamLink).toBeDefined()

    // Clean up
    document.body.removeChild(teamSection)
  })

  it('should set Home as active when scrolled to top', () => {
    render(<Header />)

    // Scroll to top
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true })
    fireEvent.scroll(window)

    // Home link should be active
    const homeLinks = screen.getAllByText('Home')
    const activeHomeLink = homeLinks.find((link) => link.className.includes('text-blue-600'))
    expect(activeHomeLink).toBeDefined()
  })
})
