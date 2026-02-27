/**
 * Test Configuration for Template Customization
 *
 * This file contains all content-specific values used in E2E tests.
 * When customizing this template for a new organization, update these
 * values to match your content instead of modifying individual test files.
 *
 * This makes it easy to:
 * 1. Identify what needs to change when using the template
 * 2. Keep tests working with customized content
 * 3. Maintain a single source of truth for test expectations
 */

export const testConfig = {
  /**
   * Social Media Links Configuration
   * Used in: tests/social-links.spec.ts
   */
  socialLinks: {
    facebook: {
      url: 'facebook.com/freeforcharity',
      ariaLabel: 'Facebook',
    },
    twitter: {
      url: 'x.com/freeforcharity1',
      ariaLabel: 'X (Twitter)',
    },
    linkedin: {
      url: 'linkedin.com/company/freeforcharity',
      ariaLabel: 'LinkedIn',
    },
    github: {
      url: 'github.com/FreeForCharity/FFC-IN-Footer-Only-Template',
      ariaLabel: 'GitHub',
    },
  },

  /**
   * Copyright Configuration
   * Used in: tests/copyright.spec.ts
   */
  copyright: {
    text: 'All Rights Are Reserved by Free For Charity a US 501c3 Non Profit',
    searchText: 'All Rights Are Reserved',
    linkUrl: 'https://freeforcharity.org',
    linkText: 'https://freeforcharity.org',
  },

  /**
   * Google Tag Manager Configuration
   * Used in: tests/google-tag-manager.spec.ts
   */
  googleTagManager: {
    id: 'GTM-TQ5H8HPR',
  },

  /**
   * Logo Configuration
   * Used in: tests/footer-only.spec.ts
   */
  logo: {
    headerAlt: 'Free For Charity',
  },

  /**
   * Cookie Consent Configuration
   * Used in: tests/cookie-consent.spec.ts
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
