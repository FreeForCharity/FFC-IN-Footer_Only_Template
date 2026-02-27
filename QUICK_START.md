# Quick Start Guide

Get up and running with the FFC Footer-Only Template in 5 minutes.

> **Using this as a template?** See [TEMPLATE_USAGE.md](./TEMPLATE_USAGE.md) for complete setup instructions including GitHub settings configuration.

> **Quick checklist?** See [TEMPLATE_SETUP_CHECKLIST.md](./TEMPLATE_SETUP_CHECKLIST.md) for a printable checklist of required steps.

## Prerequisites

- **Node.js 20.x** - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Git** - [Download here](https://git-scm.com/)

## 5-Minute Setup

### 1. Clone the Repository (30 seconds)

```bash
git clone https://github.com/FreeForCharity/FFC-IN-Footer-Only-Template.git
cd FFC-IN-Footer-Only-Template
```

### 2. Install Dependencies (17 seconds)

```bash
npm install
```

**Expected output**: 1000+ packages installed successfully

### 3. Start Development Server (1 second)

```bash
npm run dev
```

**Open**: [http://localhost:3000](http://localhost:3000)

**Expected**: Site loads with team section, header, and footer

### 4. Verify Setup (2 minutes)

Run tests to ensure everything works:

```bash
# Lint code (2 seconds)
npm run lint

# Run unit tests (3 seconds)
npm test

# Build for production (20 seconds)
npm run build
```

**Expected**: All checks pass with 0 errors (2 warnings about `<img>` tags are expected for static export)

---

## Common Tasks

### Development

```bash
# Start dev server with hot reload
npm run dev

# Start on different port
PORT=3001 npm run dev
```

### Code Quality

```bash
# Format code with Prettier
npm run format

# Check formatting without changes
npm run format:check

# Lint code with ESLint
npm run lint
```

### Testing

```bash
# Run unit tests
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run E2E tests with Playwright
npm run test:e2e

# Run E2E tests in headed mode (see browser)
npm run test:e2e:headed

# Open Playwright UI
npm run test:e2e:ui
```

### Building & Previewing

```bash
# Build for production
npm run build

# Preview production build locally
npm run preview
# Opens at http://localhost:3000

# Check for broken links (requires build first)
npm run check-links
```

### Git Workflow

```bash
# Create a feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "feat: your feature description"

# Push to remote
git push origin feature/your-feature-name
```

**Note**: Pre-commit hooks will automatically run formatting and linting checks.

---

## Project Structure (Quick Reference)

```
FFC-IN-Footer-Only-Template/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout with metadata
│   │   ├── page.tsx                # Homepage (team section)
│   │   ├── globals.css             # Global styles
│   │   ├── home-page/              # Homepage wrapper
│   │   ├── cookie-policy/          # Cookie Policy page
│   │   ├── donation-policy/        # Donation Policy page
│   │   ├── privacy-policy/         # Privacy Policy page
│   │   ├── terms-of-service/       # Terms of Service page
│   │   └── ...                     # Other policy pages
│   ├── components/
│   │   ├── header/                 # Navigation header
│   │   ├── footer/                 # Footer component
│   │   ├── cookie-consent/         # Cookie consent banner
│   │   ├── google-tag-manager/     # Analytics integration
│   │   ├── home-page/              # Team section
│   │   └── ui/                     # TeamMemberCard
│   ├── lib/
│   │   ├── assetPath.ts            # GitHub Pages asset helper
│   │   ├── fonts.ts                # Font configuration
│   │   └── siteMetadata.ts         # SEO metadata
│   └── data/                       # Team member data (JSON)
├── public/                         # Static assets (images, icons)
├── tests/                          # Playwright E2E tests
├── __tests__/                      # Jest unit tests
├── .github/workflows/              # CI/CD workflows
└── [config files]                  # Next.js, ESLint, etc.
```

---

## Key Files to Know

| File                             | Purpose                                  |
| -------------------------------- | ---------------------------------------- |
| `src/app/page.tsx`               | Homepage content (team section)          |
| `src/app/layout.tsx`             | Site-wide layout and metadata            |
| `src/components/footer/`         | Footer with contact, social, policies    |
| `src/components/header/`         | Navigation and mobile menu               |
| `src/components/cookie-consent/` | GDPR cookie consent system               |
| `src/lib/siteMetadata.ts`        | SEO metadata (Open Graph, Twitter Cards) |
| `src/data/team/`                 | Team member JSON data files              |
| `tests/test.config.ts`           | E2E test configuration (customize here)  |
| `next.config.ts`                 | Next.js configuration (static export)    |

---

## Environment Variables

No environment variables are required for local development. The site works out of the box.

**Optional variables**:

```bash
# .env.local (create if needed)

# Optional: Set to 'production' to enable search engine indexing
NEXT_PUBLIC_SITE_ENV=development

# Optional: Override base path for deployment testing
NEXT_PUBLIC_BASE_PATH=

# Optional: Google Tag Manager ID
NEXT_PUBLIC_GTM_ID=
```

---

## Making Your First Change

### 1. Update Team Member Data

Edit a team member JSON file in `src/data/team/`:

```json
{
  "name": "Jane Doe",
  "role": "Executive Director",
  "bio": "Leading our mission to help nonprofits.",
  "image": "/team/jane-doe.jpg"
}
```

### 2. Update Footer Content

Edit `src/components/footer/index.tsx` to update contact information, social media links, or branding.

### 3. Write a Test

Create `__tests__/components/MyComponent.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import MyComponent from '@/components/MyComponent'

describe('MyComponent', () => {
  it('renders the component', () => {
    render(<MyComponent />)
    expect(screen.getByText('My New Component')).toBeInTheDocument()
  })
})
```

Run the test:

```bash
npm test MyComponent
```

---

## Troubleshooting

### Port Already in Use

```bash
npx kill-port 3000
# Or use a different port
PORT=3001 npm run dev
```

### Build Fails

```bash
rm -rf .next
rm -rf node_modules package-lock.json
npm install
npm run build
```

### E2E Tests Fail

```bash
npx playwright install --with-deps chromium
npm run test:e2e
```

### Module Not Found Errors

The `@` alias points to `src/`. Make sure file paths are correct and restart your editor/terminal.

---

## Next Steps

- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - How to contribute
- **[TESTING.md](./TESTING.md)** - Detailed testing guide
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Deployment instructions
- **[TEMPLATE_USAGE.md](./TEMPLATE_USAGE.md)** - Complete template setup guide

---

## Quick Command Reference

```bash
# Development
npm run dev                 # Start dev server
npm run build               # Build for production
npm run preview             # Preview production build

# Quality Checks
npm run lint                # Lint code
npm run format              # Format code
npm run format:check        # Check formatting

# Testing
npm test                    # Run unit tests
npm run test:watch          # Watch mode
npm run test:coverage       # With coverage
npm run test:e2e            # E2E tests
npm run test:e2e:headed     # E2E with browser
npm run check-links         # Check for broken links
```
