/**
 * Test Configuration for Template Customization
 *
 * Content-specific values used in E2E tests.
 *
 * These are DERIVED from src/lib/site.config.ts rather than copied. A fork's
 * rebrand edits one file; duplicating the same values here means a correct
 * rebrand turns the E2E suite red, which is the contradiction that already
 * existed between the unit suite and `npm run check:rebrand`.
 *
 * Only values that genuinely have no home in siteConfig — test-structural
 * strings like cookie-banner button labels — are literals here.
 */
import { siteConfig } from '../src/lib/site.config'
import { GTM_ID } from '../src/lib/analytics.config'

/** Strip the scheme so specs can match with a CSS `href*=` substring selector. */
function hrefNeedle(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '')
}

export const testConfig = {
  /**
   * Social Media Links Configuration
   * Used in: tests/social-links.spec.ts
   *
   * Derived from siteConfig.social, so the number of links and which platforms
   * appear follow the charity's own configuration. Links with an empty href are
   * disabled in the footer and are excluded here to match.
   */
  socialLinks: siteConfig.social
    .filter((link) => link.href)
    .map((link) => ({
      url: hrefNeedle(link.href),
      ariaLabel: link.label,
    })),

  /**
   * Every label in siteConfig.social, including links disabled with an empty
   * href. A fork may legitimately disable all of them; the specs use this to
   * assert a disabled platform renders NO icon, which is the only meaningful
   * check when `socialLinks` above is empty.
   */
  allSocialLabels: siteConfig.social.map((link) => link.label),

  /**
   * Copyright Configuration
   * Used in: tests/copyright.spec.ts
   */
  copyright: {
    text: `All Rights Are Reserved by ${siteConfig.name} a US 501c3 Non Profit`,
    searchText: 'All Rights Are Reserved',
    // The permanent "Supported by Free For Charity" attribution (FFC footer
    // standard). Deliberately LITERAL, not read from siteConfig.supportedBy:
    // the whole point of the standard is that a fork may not repoint or remove
    // it, and deriving these from the config would make a fork that changed
    // them pass — the check would follow the defect instead of catching it.
    linkUrl: 'https://freeforcharity.org',
    linkText: 'Free For Charity',
  },

  /**
   * Google Tag Manager Configuration
   * Used in: tests/google-tag-manager.spec.ts
   *
   * Empty until the charity's own container is provisioned (FFC workflows
   * 505/503). The GTM spec skips itself while this is empty rather than waiting
   * for a script that an unconfigured site correctly never injects.
   */
  googleTagManager: {
    // Trimmed to match the component, which treats a whitespace-only id as
    // unconfigured. Without the trim here, '   ' would be reported as
    // configured and the E2E suite would wait for a tag that never renders.
    id: GTM_ID.trim(),
    configured: GTM_ID.trim() !== '',
  },

  /**
   * Site identity
   * Used in: tests/policy-pages.spec.ts, tests/smoke.spec.ts
   */
  site: {
    name: siteConfig.name,
  },

  /**
   * Logo Configuration
   * Used in: tests/footer-only.spec.ts
   */
  logo: {
    headerAlt: siteConfig.name,
  },

  /**
   * Cookie Consent Configuration
   * Used in: tests/cookie-consent.spec.ts
   *
   * Genuinely template-structural: these are the component's own button labels,
   * identical on every fork.
   */
  cookieConsent: {
    bannerHeading: 'We Value Your Privacy',
    modalHeading: 'Cookie Preferences',
    buttons: {
      acceptAll: 'Accept All',
      declineAll: 'Decline All',
      customize: 'Customize',
      savePreferences: 'Save Preferences',
      cancel: 'Cancel',
    },
  },
}
