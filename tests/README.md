# E2E Test Configuration Guide

## Overview

This directory contains end-to-end (E2E) tests that validate the footer-only template functionality using Playwright. The tests cover footer links, cookie consent, copyright notices, social media links, Google Tag Manager, and policy pages.

## Quick Start

### Running Tests

```bash
# Build the site first
npm run build

# Run tests
npm run test:e2e

# Run tests with UI (interactive)
npm run test:e2e:ui

# Run tests in headed mode (see browser)
npm run test:e2e:headed
```

## Customizing Tests for Your Organization

When you customize this template for a new organization, update `tests/test.config.ts` with your content:

```typescript
export const testConfig = {
  socialLinks: {
    facebook: { url: 'facebook.com/yourcharity', ariaLabel: 'Facebook' },
    twitter: { url: 'x.com/yourcharity', ariaLabel: 'X (Twitter)' },
    linkedin: { url: 'linkedin.com/company/yourcharity', ariaLabel: 'LinkedIn' },
    github: { url: 'github.com/yourcharity', ariaLabel: 'GitHub' },
  },
  copyright: {
    text: 'All Rights Reserved by Your Charity a 501c3 Non Profit',
    searchText: 'All Rights Reserved',
    linkUrl: 'https://yourcharity.org',
    linkText: 'https://yourcharity.org',
  },
  googleTagManager: { id: 'GTM-XXXXXXX' },
  logo: { headerAlt: 'Your Charity' },
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
```

## Configuration Reference

### Social Media Links (`social-links.spec.ts`)

- `socialLinks.*.url`: Social media profile URLs
- `socialLinks.*.ariaLabel`: Accessibility labels for screen readers

### Copyright Notice (`copyright.spec.ts`)

- `copyright.text`: Full copyright text
- `copyright.searchText`: Text used to locate the copyright element
- `copyright.linkUrl`: Organization website URL
- `copyright.linkText`: Displayed link text

### Google Tag Manager (`google-tag-manager.spec.ts`)

- `googleTagManager.id`: Your GTM container ID

### Logo (`footer-only.spec.ts`)

- `logo.headerAlt`: Alt text for header logo

### Cookie Consent (`cookie-consent.spec.ts`)

- `cookieConsent.bannerHeading`: Cookie banner heading
- `cookieConsent.modalHeading`: Preferences modal heading
- `cookieConsent.buttons.*`: Button text for all cookie consent buttons

## Test Files

| File                         | What It Tests                               |
| ---------------------------- | ------------------------------------------- |
| `footer-only.spec.ts`        | Footer structure, links, and content        |
| `social-links.spec.ts`       | Social media link validation                |
| `copyright.spec.ts`          | Copyright notice with current year          |
| `google-tag-manager.spec.ts` | GTM integration                             |
| `cookie-consent.spec.ts`     | Cookie consent banner and preferences       |
| `policy-pages.spec.ts`       | Policy page rendering and footer link hrefs |

## Adding New Tests

1. Create a new test file: `tests/your-feature.spec.ts`
2. Import the test config: `import { testConfig } from './test.config'`
3. Add configuration for your feature to `test.config.ts`
4. Write tests using the configuration values

## Troubleshooting

**Tests fail after customization**: Verify all values in `test.config.ts` match your page content exactly. Text matching is case-sensitive.

**Tests can't find elements**: Run tests with the UI to see what's happening: `npm run test:e2e:ui`

**GTM tests fail**: Update `googleTagManager.id` with your actual GTM container ID.

## Further Reading

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [TESTING.md](../TESTING.md) -- Project testing guide
