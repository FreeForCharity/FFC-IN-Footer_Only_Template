'use client'

import React from 'react'
import Link from 'next/link'
import { Mail, Phone, MapPin, ArrowRight, Link2 } from 'lucide-react'

import { FaFacebookF, FaLinkedinIn, FaGithub } from 'react-icons/fa'
import { FaXTwitter } from 'react-icons/fa6'
import type { IconType } from 'react-icons'
import type { LucideIcon } from 'lucide-react'
import { assetPath } from '@/lib/assetPath'
import { donateHref, siteConfig, volunteerHref } from '@/lib/site.config'

// Maps a social link's label (as defined in siteConfig.social) to an icon.
// Unknown labels fall back to a generic link icon (Link2) so a charity
// that adds a new social network — Bluesky, Mastodon, YouTube, etc. — gets a
// sensible placeholder instead of a misleading GitHub mark.
const socialIconByLabel: Record<string, IconType | LucideIcon> = {
  Facebook: FaFacebookF,
  'X (Twitter)': FaXTwitter,
  Twitter: FaXTwitter,
  X: FaXTwitter,
  LinkedIn: FaLinkedinIn,
  GitHub: FaGithub,
}

const Footer: React.FC = () => {
  const currentYear = React.useMemo(() => new Date().getFullYear(), [])
  const socialLinks = siteConfig.social.filter((social) => social.href)

  return (
    <footer className="bg-black text-white">
      {/* Mission line: the footer renders on every page, so even a footer-only
          site states who the charity is and what it does everywhere. */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-12 text-center">
        <p className="text-[28px] font-[500]">{siteConfig.name}</p>
        <p className="aria-font text-[18px] mt-2">{siteConfig.mission}</p>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 py-12 px-4 md:px-6 lg:px-8">
        {/* Column 1: Endorsements */}
        <div className="space-y-6 px-4 sm:px-0">
          <h3 className="text-[28px] text-white">Endorsements</h3>

          <div className="space-y-4">
            {/* Candid links render only when configured: a charity without IRS
                recognition has no public profile yet, and an empty href would
                look like a working link while going nowhere. */}
            {siteConfig.guidestar.profileUrl.trim() && (
              <a
                href={siteConfig.guidestar.profileUrl}
                aria-label={`View ${siteConfig.name} GuideStar Profile`}
              >
                <img
                  src={assetPath('/Svgs/footerImage.svg')}
                  alt="GuideStar Platinum Seal of Transparency"
                />
              </a>
            )}
            {siteConfig.guidestar.directProfileUrl.trim() && (
              <Link
                href={siteConfig.guidestar.directProfileUrl}
                className="group relative my-4 flex w-full max-w-[230px] items-center justify-between
                  border-2 border-[#2ea3f2] bg-black px-5 py-2.5 text-[#2ea3f2]
                  transition-all duration-300 hover:border-transparent aria-font"
              >
                <span className="text-[17px] font-medium leading-tight sm:text-[18px] md:text-[20px] transition-transform duration-300 group-hover:-translate-x-1">
                  Direct GuideStar Profile Link
                </span>

                <ArrowRight
                  className="h-8 w-8 translate-x-2 opacity-0 text-[#2ea3f2] transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
                  strokeWidth={2}
                />
              </Link>
            )}

            <p>
              <span className="font-[500] text-[22px]">
                {siteConfig.name} EIN: {siteConfig.ein}
              </span>
            </p>
          </div>
        </div>

        {/* Column 2: Quick Links */}
        <div className="space-y-6 px-4 sm:px-0">
          <h3 className="text-[28px] text-white">Quick Links</h3>

          <ul className="space-y-2 text-sm" id="lato-font">
            {[
              // Adopters: add an entry here for each section or route your own
              // site serves.
              //
              // Only destinations this template ACTUALLY renders are listed.
              // Until #146 these were eight conventional anchors borrowed from
              // the Single Page template — /#hero, /#mission, /#programs,
              // /#events, /#donate, /#volunteer, /#faq — and a footer-only site
              // has none of those sections, so seven of the eight links did
              // nothing on the template's own deployment and on every fork that
              // had not yet added the sections. A link that silently goes
              // nowhere is worse than an absent one: it looks navigable, and a
              // screen reader announces it as a working link.
              //
              // `__tests__/components/Footer.test.tsx` resolves every entry
              // below against the sitemap routes, and every fragment against
              // the ids the home page really renders, so a dead link added here
              // fails the suite instead of shipping.
              { name: 'Home', href: '/' },
              { name: 'Team', href: '/#team' },
              // Giving and volunteering pathways. Each is a single link, not a
              // page section: the configured URL, or an email to the charity
              // when none is set (see donateHref / volunteerHref).
              { name: 'Donate', href: donateHref() },
              { name: 'Volunteer', href: volunteerHref() },
              // FFC footer standard: every supported charity site links back
              // to the supporting org's hub. Always rendered — keep this
              // entry when customizing a fork.
              { name: 'Supported Charity Login', href: siteConfig.supportedBy.hubUrl },
            ].map((link) => {
              const isExternal = link.href.startsWith('http')
              return (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    target={isExternal ? '_blank' : undefined}
                    rel={isExternal ? 'noopener noreferrer' : undefined}
                    className="hover:text-[#F58C23] hover:tracking-widest transition-all text-[16px] font-[500]"
                  >
                    {link.name}
                  </Link>
                </li>
              )
            })}
          </ul>

          <div className="space-y-3">
            <h4 className="text-[28px] text-white">{siteConfig.name} Policy</h4>
            <ul className="space-y-1 text-sm" id="lato-font">
              {[
                {
                  // Hardcoded on purpose: this page documents FFC's OWN
                  // donation policy, so the label must keep FFC's name even
                  // after a fork rebrands siteConfig.name. The adjacent
                  // '/donation-policy' entry is the charity's own policy.
                  name: 'Free For Charity Donation Policy',
                  href: '/free-for-charity-donation-policy',
                },
                {
                  name: 'Donation Policy',
                  href: '/donation-policy',
                },
                {
                  name: `${siteConfig.name} Privacy Policy`,
                  href: '/privacy-policy',
                },
                {
                  name: `${siteConfig.name} Cookie Policy`,
                  href: '/cookie-policy',
                },
                {
                  name: `${siteConfig.name} Terms of Service`,
                  href: '/terms-of-service',
                },
                {
                  name: `${siteConfig.name} Vulnerability Disclosure Policy`,
                  href: '/vulnerability-disclosure-policy',
                },
                {
                  name: `${siteConfig.name} Security Acknowledgement`,
                  href: '/security-acknowledgements',
                },
              ].map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="hover:text-[#F58C23] hover:tracking-widest transition-all text-[16px] font-[500]"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
              <li>
                {/* Persistent consent re-entry point (withdrawing consent must
                    stay as easy as giving it): reopens the preferences modal
                    the cookie-consent banner registers on window. */}
                <button
                  type="button"
                  onClick={() => window.openCookiePreferences?.()}
                  className="hover:text-[#F58C23] hover:tracking-widest transition-all text-[16px] font-[500]"
                >
                  Cookie Preferences
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Column 3: Contact Us */}
        <div className="space-y-6 px-4 sm:px-0">
          <h3 className="text-[28px] text-white">Contact Us</h3>

          <div className="space-y-4 text-sm">
            <div className="flex items-start gap-3">
              <Mail className="w-10 h-10 text-orange-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-[500] text-[22px]">E-mail</p>
                <a
                  href={`mailto:${siteConfig.contactEmail}`}
                  className="aria-font font-[500] text-[15px] hover:text-cyan-400 transition-colors break-all"
                >
                  {siteConfig.contactEmail}
                </a>
              </div>
            </div>

            {/*
              Rendered only when a number is actually configured. A charity with
              no published phone number leaves siteConfig.phone empty, and an
              empty `tel:` link is worse than an absent one: it still looks
              callable to a sighted user and is still announced as a phone link
              by a screen reader, but dials nothing. Before this guard the only
              way to express "no phone" was a placeholder string, which shipped
              as `tel:PENDING` on a live charity site.
            */}
            {siteConfig.phone.tel.trim() && siteConfig.phone.display.trim() && (
              <div className="flex items-start gap-3">
                <Phone className="w-10 h-10 text-orange-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-[500] text-[22px]">Call Us Today</p>
                  <a
                    href={`tel:${siteConfig.phone.tel.trim()}`}
                    className="aria-font font-[500] text-[16px] hover:text-cyan-400 transition-colors"
                  >
                    {siteConfig.phone.display}
                  </a>
                </div>
              </div>
            )}

            {siteConfig.addresses.map((address) => (
              <a
                key={address.label}
                href={address.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 hover:opacity-80 transition-opacity"
              >
                <MapPin className="w-10 h-10 text-orange-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-[500] text-[22px]">{address.label}</p>
                  <p className="aria-font font-[500] text-[16px]">
                    {address.lines.map((line, index) => (
                      <React.Fragment key={line}>
                        {line}
                        {index < address.lines.length - 1 ? <br /> : null}
                      </React.Fragment>
                    ))}
                  </p>
                  {/* The accessible name must contain the visible text
                      (WCAG 2.5.3 label-in-name), so instead of an aria-label
                      that replaces it, append screen-reader-only context. */}
                  <span className="sr-only">(opens in Google Maps)</span>
                </div>
              </a>
            ))}

            <div className="flex gap-3 pt-4">
              {socialLinks.map(({ href, label }) => {
                const Icon = socialIconByLabel[label] ?? Link2
                return (
                  <a
                    key={`${label}-${href}`}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="bg-orange-500 p-2 rounded-full hover:bg-orange-600 transition-colors"
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </a>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="aria-font mt-12 py-6 px-4 border-t border-gray-800 text-center text-[18px] font-[500] w-full">
        <p>
          © {currentYear} All Rights Are Reserved by {siteConfig.name} a US 501c3 Non Profit
          {/* FFC footer standard: the "Supported by Free For Charity" attribution
              below is the permanent part to KEEP when customizing this template
              (the surrounding copyright text above is placeholder). */}
          {' | Supported by '}
          <Link
            href={siteConfig.supportedBy.url}
            className="underline text-[#2EA3F2] hover:text-[#2EA3F2] transition-colors"
          >
            {siteConfig.supportedBy.name}
          </Link>
          {siteConfig.parentOrg && (
            <>
              {' | A project of '}
              <Link
                href={siteConfig.parentOrg.url}
                className="underline text-[#2EA3F2] hover:text-[#2EA3F2] transition-colors"
              >
                {siteConfig.parentOrg.name}
              </Link>
            </>
          )}
        </p>
      </div>
    </footer>
  )
}

export default Footer
