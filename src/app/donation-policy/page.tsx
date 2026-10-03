import type { Metadata } from 'next'
import { siteConfig } from '@/lib/site.config'
import { pageMetadata } from '@/lib/pageMetadata'
import ContactEmail from '@/components/policy/ContactEmail'

export const metadata: Metadata = pageMetadata({
  title: 'Donation Policy',
  description: `Donation Policy for ${siteConfig.name}`,
  path: '/donation-policy',
})

export default function DonationPolicy() {
  // An EIN still awaiting the charity (listed in siteConfig.pending) is empty:
  // leave the parenthetical out rather than render "(EIN: )".
  const ein = siteConfig.ein.trim()
  const einClause = ein ? ` (EIN: ${ein})` : ''

  return (
    <main id="main-content" className="ffc-container py-16">
      <div className="max-w-4xl mx-auto">
        <h1 className="font-[var(--font-faustina)] text-[48px] leading-[60px] mb-8">
          Donation Policy
        </h1>

        <div className="prose max-w-none font-[var(--font-lato)] text-[18px] leading-[28px]">
          <p>
            <strong>Effective Date:</strong> January 1, 2024
          </p>

          <h2 className="font-[var(--font-faustina)] text-[32px] leading-[40px] mt-8 mb-4">
            Tax Deductibility
          </h2>
          {/* A legal claim, made only when siteConfig.taxStatusLabel says the
              organization holds IRS 501(c)(3) recognition. */}
          {siteConfig.taxStatusLabel.trim() ? (
            <p>
              {siteConfig.name} is a qualified 501(c)(3) nonprofit organization
              {`${einClause}.`} Donations are tax-deductible to the full extent allowed by law.
            </p>
          ) : (
            <p>
              {siteConfig.name}
              {einClause} has not yet received IRS recognition as a 501(c)(3) organization, so
              donations may not be tax-deductible. Please consult a tax advisor before claiming a
              deduction.
            </p>
          )}

          <h2 className="font-[var(--font-faustina)] text-[32px] leading-[40px] mt-8 mb-4">
            Use of Donations
          </h2>
          <p>
            Donations support {siteConfig.name}&apos;s mission and the administrative costs
            necessary to carry it out: {siteConfig.mission}
          </p>

          <h2 className="font-[var(--font-faustina)] text-[32px] leading-[40px] mt-8 mb-4">
            Donation Processing
          </h2>
          <p>
            Donations are processed securely through our payment partners. You will receive a
            receipt for tax purposes via email after your donation is processed.
          </p>

          <h2 className="font-[var(--font-faustina)] text-[32px] leading-[40px] mt-8 mb-4">
            Refund Policy
          </h2>
          <p>
            We generally do not provide refunds for donations. However, if you believe an error has
            occurred, please contact us within 30 days of your donation.
          </p>

          <h2 className="font-[var(--font-faustina)] text-[32px] leading-[40px] mt-8 mb-4">
            Privacy
          </h2>
          <p>
            Donor information is kept confidential and will not be shared with third parties except
            as required by law.
          </p>

          <h2 className="font-[var(--font-faustina)] text-[32px] leading-[40px] mt-8 mb-4">
            Contact Us
          </h2>
          <p>For questions about donations or this policy, please contact us at:</p>
          <p>
            Email: <ContactEmail className="text-primary underline" />
            {/* Only a configured number is shown, matching the footer's phone guard. */}
            {siteConfig.phone.tel.trim() && siteConfig.phone.display.trim() && (
              <>
                <br />
                Phone: {siteConfig.phone.display}
              </>
            )}
          </p>
        </div>
      </div>
    </main>
  )
}
