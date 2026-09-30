import React from 'react'
import { render, screen } from '@testing-library/react'
import ContactEmail from '../../src/components/policy/ContactEmail'
import { PENDING_TEXT, siteConfig } from '../../src/lib/site.config'

// The contact email in policy and error-page prose: a mailto link when set,
// the visible "awaiting information" text while the charity has not supplied
// one, and never an empty mailto: link.
describe('ContactEmail', () => {
  const original = { contactEmail: siteConfig.contactEmail, pending: siteConfig.pending }
  afterEach(() => {
    Object.assign(siteConfig, original)
  })

  it('links the configured address', () => {
    siteConfig.contactEmail = 'hello@example.org'
    siteConfig.pending = []
    render(<ContactEmail className="x" />)
    const link = screen.getByRole('link', { name: 'hello@example.org' })
    expect(link).toHaveAttribute('href', 'mailto:hello@example.org')
    expect(link).toHaveClass('x')
  })

  it('shows the placeholder as plain text while the email is pending', () => {
    siteConfig.contactEmail = ''
    siteConfig.pending = ['email']
    const { container } = render(<ContactEmail className="x" />)
    expect(screen.getByText(PENDING_TEXT).closest('a')).toBeNull()
    expect(container.querySelector('a')).toBeNull()
  })

  it('renders no link and no placeholder for an empty email that is not pending', () => {
    siteConfig.contactEmail = ''
    siteConfig.pending = []
    const { container } = render(<ContactEmail className="x" />)
    expect(container.querySelector('a')).toBeNull()
    expect(container.textContent).toBe('')
  })
})
