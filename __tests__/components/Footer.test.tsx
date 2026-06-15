import React from 'react'
import { render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import Footer from '../../src/components/footer'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

describe('Footer component', () => {
  it('should render the footer', () => {
    render(<Footer />)
    const footer = screen.getByRole('contentinfo')
    expect(footer).toBeInTheDocument()
  })

  it('should display Endorsements section', () => {
    render(<Footer />)
    expect(screen.getByText('Endorsements')).toBeInTheDocument()
  })

  it('should display Quick Links section', () => {
    render(<Footer />)
    expect(screen.getByText('Quick Links')).toBeInTheDocument()
  })

  it('should display Contact Us section with contact information', () => {
    render(<Footer />)
    expect(screen.getByText('Contact Us')).toBeInTheDocument()
  })

  it('should have social media links', () => {
    render(<Footer />)
    const links = screen.getAllByRole('link')
    expect(links.length).toBeGreaterThan(0)
  })

  it('should display the current year in copyright', () => {
    render(<Footer />)
    const currentYear = new Date().getFullYear()
    expect(screen.getByText(new RegExp(currentYear.toString()))).toBeInTheDocument()
  })

  it('should have GuideStar profile link', () => {
    render(<Footer />)
    expect(screen.getByLabelText('View Free For Charity GuideStar Profile')).toHaveAttribute(
      'href',
      'https://www.guidestar.org/profile/46-2471893'
    )
    expect(screen.getByText('Direct GuideStar Profile Link').closest('a')).toHaveAttribute(
      'href',
      'https://www.guidestar.org/profile/shared/bbbe173a-87b9-4af9-a8a2-cae255a95742'
    )
  })

  it('should have email contact link', () => {
    render(<Footer />)
    const emailLink = screen.getByText('clarkemoyer@freeforcharity.org').closest('a')
    expect(emailLink).toHaveAttribute('href', 'mailto:clarkemoyer@freeforcharity.org')
  })

  it('should display the EIN number', () => {
    render(<Footer />)
    expect(screen.getByText(/46-2471893/)).toBeInTheDocument()
  })

  it('should have phone contact link', () => {
    render(<Footer />)
    expect(screen.getByText('(520) 222-8104').closest('a')).toHaveAttribute(
      'href',
      'tel:5202228104'
    )
  })

  it('should display the Free For Charity Policy section', () => {
    render(<Footer />)
    expect(screen.getByText('Free For Charity Policy')).toBeInTheDocument()
  })

  it('should have all social media links with correct aria-labels', () => {
    render(<Footer />)
    for (const { href, label } of [
      { label: 'Facebook', href: 'https://www.facebook.com/freeforcharity' },
      { label: 'X (Twitter)', href: 'https://x.com/freeforcharity1' },
      { label: 'LinkedIn', href: 'https://www.linkedin.com/company/freeforcharity/' },
      { label: 'GitHub', href: 'https://github.com/FreeForCharity/FFC-IN-Footer-Only-Template' },
    ]) {
      const link = screen.getByLabelText(label)
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', href)
    }
  })

  it('should have social media links open in new tabs', () => {
    render(<Footer />)
    const fbLink = screen.getByLabelText('Facebook')
    expect(fbLink).toHaveAttribute('target', '_blank')
    expect(fbLink).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('should have policy links with correct hrefs', () => {
    render(<Footer />)
    const policyLinks = [
      { text: 'Free For Charity Privacy Policy', href: '/privacy-policy' },
      { text: 'Free For Charity Cookie Policy', href: '/cookie-policy' },
      { text: 'Free For Charity Terms of Service', href: '/terms-of-service' },
      { text: 'Free For Charity Donation Policy', href: '/free-for-charity-donation-policy' },
    ]

    for (const { text, href } of policyLinks) {
      const link = screen.getByText(text).closest('a')
      expect(link).toHaveAttribute('href', href)
    }
  })

  it('should have GuideStar image with alt text', () => {
    render(<Footer />)
    expect(screen.getByAltText('GuideStar Platinum Seal of Transparency')).toBeInTheDocument()
  })

  it('should have Google Maps links for addresses', () => {
    render(<Footer />)
    const mainAddress = screen.getByLabelText('Open main address in Google Maps')
    const paAddress = screen.getByLabelText('Open PA office address in Google Maps')

    expect(mainAddress).toHaveAttribute(
      'href',
      'https://www.google.com/maps/search/?api=1&query=4030+Wake+Forrest+Road+Suite+349+Raleigh+NC+27609'
    )
    expect(paAddress).toHaveAttribute(
      'href',
      'https://www.google.com/maps/place/Free+For+Charity/@40.7768455,-77.8963305,17z/data=!3m1!4b1!4m6!3m5!1s0x89cea944b44a2e01:0x6fc2d6bf09e00a0f!8m2!3d40.7768415!4d-77.8937556!16s%2Fg%2F11vzvbl2d7?entry=ttu&g_ep=EgoyMDI1MTEyMy4xIKXMDSoASAFQAw%3D%3D'
    )
    expect(mainAddress).toHaveTextContent('4030 Wake Forrest Road')
    expect(paAddress).toHaveTextContent('301 Science Park Road Suite')
  })

  it('should display freeforcharity.org link in copyright bar', () => {
    render(<Footer />)
    const copyright = screen.getByText((_, node) => {
      return (
        node?.tagName.toLowerCase() === 'p' && node.textContent?.includes('All Rights Are Reserved')
      )
    })
    expect(copyright).toHaveTextContent('Free For Charity')
    const link = screen.getByText('https://freeforcharity.org')
    expect(link.closest('a')).toHaveAttribute('href', 'https://freeforcharity.org')
  })

  it('should not have accessibility violations', async () => {
    const { container } = render(<Footer />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
