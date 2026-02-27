# FFC Footer-Only Template

A focused Next.js template that gives nonprofit websites a professional footer, legal policy pages, cookie compliance, analytics tracking, and team display -- all the backend formality a charity site needs.

## Why This Template Exists

Many nonprofits already have a website design but lack the legal, compliance, and infrastructure pieces that a professional web presence requires. This template provides exactly those pieces so charities can adopt them without building from scratch:

- **Legal compliance** -- 7 policy pages (privacy, cookies, terms, donation, vulnerability disclosure, security acknowledgements)
- **Cookie consent** -- GDPR-compliant banner with granular opt-in/opt-out controls
- **Analytics infrastructure** -- Google Tag Manager integration with consent-aware data layer events
- **Professional footer** -- Contact info, social media links, policy links, GuideStar badge, Google Maps, branding
- **Team section** -- Showcase your team with data-driven member cards
- **SEO infrastructure** -- Sitemap, robots.txt, Open Graph, Twitter Cards, structured metadata
- **Static export** -- Deploys to GitHub Pages with zero server costs

## Quick Start

```bash
git clone https://github.com/FreeForCharity/FFC-IN-Footer-Only-Template.git
cd FFC-IN-Footer-Only-Template
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## What's Included

### Components

| Component              | Purpose                                                              |
| ---------------------- | -------------------------------------------------------------------- |
| **Footer**             | Contact info, social media, policy links, GuideStar badge, copyright |
| **Header**             | Responsive navigation with mobile menu and search                    |
| **Cookie Consent**     | GDPR-compliant banner with Accept All / Decline All / Customize      |
| **Google Tag Manager** | Analytics integration with consent-aware tracking                    |
| **Team Section**       | Data-driven team member display                                      |
| **TeamMemberCard**     | Individual team member card with photo, role, bio                    |

### Policy Pages (7 Routes)

| Route                               | Content                               |
| ----------------------------------- | ------------------------------------- |
| `/privacy-policy`                   | Privacy Policy                        |
| `/cookie-policy`                    | Cookie Policy                         |
| `/terms-of-service`                 | Terms of Service                      |
| `/donation-policy`                  | Donation Policy                       |
| `/free-for-charity-donation-policy` | Organization-specific Donation Policy |
| `/vulnerability-disclosure-policy`  | Vulnerability Disclosure Policy       |
| `/security-acknowledgements`        | Security Acknowledgements             |

### SEO & Infrastructure

- Dynamic sitemap generation (`src/app/sitemap.ts`)
- Robots.txt configuration (`src/app/robots.ts`)
- Global metadata with Open Graph and Twitter Cards (`src/lib/siteMetadata.ts`)
- Static export for GitHub Pages deployment

## Tech Stack

| Layer     | Technology                                                         |
| --------- | ------------------------------------------------------------------ |
| Framework | Next.js 16 with App Router                                         |
| Language  | TypeScript (strict mode)                                           |
| Styling   | Tailwind CSS v4                                                    |
| Export    | Static (`output: 'export'`)                                        |
| Hosting   | GitHub Pages                                                       |
| CI/CD     | GitHub Actions                                                     |
| Testing   | Jest + Testing Library, Playwright (E2E), jest-axe (accessibility) |

## Project Structure

```
src/
  app/
    page.tsx                              # Home page (renders team section)
    layout.tsx                            # Root layout with global metadata
    globals.css                           # Global styles
    home-page/                            # Homepage wrapper
    cookie-policy/page.tsx                # Cookie Policy
    donation-policy/page.tsx              # Donation Policy
    free-for-charity-donation-policy/     # FFC Donation Policy
    privacy-policy/page.tsx               # Privacy Policy
    security-acknowledgements/page.tsx    # Security Acknowledgements
    terms-of-service/page.tsx             # Terms of Service
    vulnerability-disclosure-policy/      # Vulnerability Disclosure Policy
    sitemap.ts                            # Dynamic sitemap
    robots.ts                             # Robots.txt config
  components/
    footer/                               # Site footer
    header/                               # Site header/navigation
    cookie-consent/                       # Cookie consent banner + preferences modal
    google-tag-manager/                   # GTM integration
    home-page/TheFreeForCharityTeam/      # Team section
    ui/TeamMemberCard.tsx                 # Team member card component
  data/
    team.ts                               # Team member data loader
    team/*.json                           # Individual team member JSON files
  lib/
    assetPath.ts                          # GitHub Pages asset path helper
    fonts.ts                              # Font configuration
    siteMetadata.ts                       # Site-wide metadata (SEO)
public/                                   # Static assets (icons, images, fonts)
```

## How This Helps Charities

Free For Charity (EIN: 46-2471893) provides free websites and domain management for 501(c)(3) nonprofits. This template serves charities that already have a website design but need:

1. **Legal protection** -- Policy pages that cover privacy, cookies, terms of service, donations, and vulnerability disclosure, written for nonprofit organizations
2. **Regulatory compliance** -- A cookie consent system that meets GDPR requirements with granular category controls (necessary, functional, analytics, marketing)
3. **Professional credibility** -- A footer with GuideStar badge, contact information, social media presence, and proper copyright notices
4. **Analytics capability** -- Google Tag Manager integration that respects user consent preferences before firing tracking tags
5. **Zero hosting costs** -- Static export deploys to GitHub Pages for free, with custom domain support

Charities can fork this template, replace the content with their own organization details, and immediately have a production-ready infrastructure layer for their website.

## Development

### Commands

| Command            | Purpose                   |
| ------------------ | ------------------------- |
| `npm run dev`      | Start development server  |
| `npm run format`   | Format code with Prettier |
| `npm run lint`     | Run ESLint                |
| `npm test`         | Run Jest unit tests       |
| `npm run build`    | Production static build   |
| `npm run test:e2e` | Run Playwright E2E tests  |

### Pre-Commit Checklist

```bash
npm run format
npm run lint
npm test
npm run build
npm run test:e2e
```

### Testing

- **Unit tests**: Jest + React Testing Library (126 tests across 12 suites)
- **Accessibility**: jest-axe for WCAG compliance checks
- **E2E tests**: Playwright for footer links, cookie consent, copyright, social links, GTM, and policy pages
- **CI**: All tests run automatically on every PR via GitHub Actions

See [TESTING.md](./TESTING.md) for the full testing guide.

## Deployment

- **Live Site**: [https://ffcworkingsite1.org](https://ffcworkingsite1.org)
- **GitHub Pages**: Automated via GitHub Actions on push to `main`
- **Static export**: `output: 'export'` in `next.config.ts`

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## Using This as a Template

1. Click **"Use this template"** on GitHub
2. Follow the [Template Usage Guide](./TEMPLATE_USAGE.md) for setup
3. See the [Template Setup Checklist](./TEMPLATE_SETUP_CHECKLIST.md) for a quick reference

### Key Customization Points

- **Organization info**: Search and replace "Free For Charity" with your org name
- **Contact details**: Update `src/components/footer/index.tsx`
- **Team members**: Edit JSON files in `src/data/team/`
- **Policy content**: Update policy page content in `src/app/*/page.tsx`
- **SEO metadata**: Edit `src/lib/siteMetadata.ts`
- **Analytics**: Set your GTM ID in environment variables
- **Branding**: Replace logos in `public/` and update color scheme in `globals.css`

## Documentation

### Getting Started

- [QUICK_START.md](./QUICK_START.md) -- 5-minute setup guide
- [TEMPLATE_USAGE.md](./TEMPLATE_USAGE.md) -- Complete template setup instructions
- [TEMPLATE_SETUP_CHECKLIST.md](./TEMPLATE_SETUP_CHECKLIST.md) -- Printable setup checklist

### Development & Testing

- [TESTING.md](./TESTING.md) -- Testing guide (Jest + Playwright)
- [CODE_QUALITY.md](./CODE_QUALITY.md) -- Code quality standards
- [NAMING_CONVENTIONS.md](./NAMING_CONVENTIONS.md) -- kebab-case for SEO

### Deployment & Operations

- [DEPLOYMENT.md](./DEPLOYMENT.md) -- GitHub Pages deployment guide
- [LIGHTHOUSE.md](./LIGHTHOUSE.md) -- Performance monitoring
- [SECURITY.md](./SECURITY.md) -- Security policies and practices
- [DEPENDABOT.md](./DEPENDABOT.md) -- Automated dependency management

### Project Governance

- [LICENSE](./LICENSE) -- Apache 2.0
- [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) -- Contributor Covenant 2.1
- [GOVERNANCE.md](./GOVERNANCE.md) -- Decision-making processes
- [CONTRIBUTING.md](./CONTRIBUTING.md) -- How to contribute
- [MAINTAINERS.md](./MAINTAINERS.md) -- Repository maintainers
- [SECURITY.md](./SECURITY.md) -- Vulnerability reporting
- [SUPPORT.md](./SUPPORT.md) -- Getting help

## Contact

**Primary Contact**: Clarke Moyer ([@clarkemoyer](https://github.com/clarkemoyer)) -- clarkemoyer@freeforcharity.org

**Organization**: [Free For Charity](https://freeforcharity.org) -- a 501(c)(3) nonprofit (EIN: 46-2471893)
