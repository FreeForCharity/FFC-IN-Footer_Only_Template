# Template Setup Checklist

Quick reference checklist for setting up a new repository from the FFC Footer-Only Template.

**For complete instructions, see [TEMPLATE_USAGE.md](./TEMPLATE_USAGE.md)**

---

## Initial Repository Creation

- [ ] Click "Use this template" button on GitHub
- [ ] Create new repository with kebab-case name
- [ ] Add repository description and topics
- [ ] Clone repository locally
- [ ] Run `pnpm install` to verify dependencies
- [ ] Run `pnpm run build` to verify build works
- [ ] Run `pnpm run dev` to test locally

---

## Essential GitHub Settings (Required)

### General Settings (Settings -> General)

- [ ] Set repository description
- [ ] Add topics (nextjs, nonprofit, static-site, footer-template, etc.)
- [ ] Enable Issues
- [ ] Enable Discussions (optional)

### GitHub Pages (Settings -> Pages)

- [ ] Source: GitHub Actions (`deploy.yml` publishes via `actions/deploy-pages`)
- [ ] Custom domain (if applicable): Enter domain name
- [ ] Wait for DNS check to complete
- [ ] Enable "Enforce HTTPS" (after DNS configured)

### Actions Permissions (Settings -> Actions -> General)

- [ ] Allow all actions and reusable workflows
- [ ] Workflow permissions: Read and write permissions
- [ ] Allow GitHub Actions to create and approve pull requests

### Security & Analysis (Settings -> Security & Analysis)

- [ ] Enable Dependency graph
- [ ] Enable Dependabot alerts
- [ ] Enable Dependabot security updates
- [ ] Enable Code scanning (CodeQL) - use **default setup** under Settings -> Code security (there is no CodeQL workflow file)
- [ ] Enable Secret scanning (if available)

---

## Branch Protection Rules (Settings -> Rules -> Rulesets)

Create ruleset named "Protect Main":

- [ ] Target branches: Include default branch (main)
- [ ] Restrict deletions
- [ ] Require pull request before merging
- [ ] Require status checks to pass:
  - [ ] Build + Unit (CI workflow)
  - [ ] E2E (shard 1/4) through E2E (shard 4/4) (CI workflow)
  - [ ] Analyze (javascript-typescript)
  - [ ] Analyze (actions)
- [ ] Require branches to be up to date
- [ ] Require signed commits
- [ ] Block force pushes

---

## Update Repository Configuration Files

### basePath in Workflows

- [ ] No edit needed: `deploy.yml` and `lighthouse.yml` compute `NEXT_PUBLIC_BASE_PATH` as `/<repo-name>` from `GITHUB_REPOSITORY`
- [ ] If using a custom domain, add `public/CNAME` (the workflows then build with an empty basePath)

### Update CODEOWNERS

- [ ] Edit `.github/CODEOWNERS`
- [ ] Replace `@clarkemoyer` with your GitHub usernames/teams

### Update FUNDING.yml (Optional)

- [ ] Edit `.github/FUNDING.yml`
- [ ] Update GitHub Sponsors username
- [ ] Update custom donation links

---

## Customize Content and Branding

### Organization Information

- [ ] Search and replace "Free For Charity" with your org name
- [ ] Search and replace EIN "46-2471893" with your EIN
- [ ] Search and replace "ffcworkingsite1.org" with your domain
- [ ] For any footer detail the charity has not supplied yet (email, phone, address, EIN, GuideStar, social, team, donation or volunteer URL): leave the field empty in `src/lib/site.config.ts` and list it in `siteConfig.pending` until the charity supplies it. Never copy another organization's values
- [ ] Leave all three `guidestar` URLs (`sealUrl`, `profileUrl`, `directProfileUrl`) empty until the charity has its own GuideStar / Candid profile (the footer then hides the seal and the direct link). The seal URL must use the charity's own Candid organization id, never another organization's

### Contact Information

- [ ] Update `src/lib/site.config.ts` - Footer contact details
- [ ] Update `SECURITY.md` - Security contact
- [ ] Update `CODE_OF_CONDUCT.md` - Conduct reporting contact
- [ ] Update `SUPPORT.md` - Support resources

### Branding Assets

- [ ] Replace logo/image files under `/public` (e.g. `public/Svgs/`, `public/Images/`)
- [ ] Replace `/public/favicon.ico` with your favicon
- [ ] Update Open Graph images (if present)
- [ ] Update color scheme in `src/app/globals.css`
- [ ] Update fonts in `src/lib/fonts.ts` (if needed)

### Content Data

- [ ] Update team members in `src/data/team/` (name, role, optional LinkedIn — no photos; cards use initials monograms)

### Policy Pages

- [ ] Update all policy page content in `src/app/*/page.tsx`
- [ ] Update SEO metadata in `src/lib/siteMetadata.ts`

### Documentation

- [ ] Update `README.md` with your information
- [ ] Update `MAINTAINERS.md` with your maintainers
- [ ] Update `GOVERNANCE.md` for your processes
- [ ] Update `CITATION.cff` with your details
- [ ] Review and customize `CONTRIBUTING.md`

---

## Verification Steps

### Test Local Development

- [ ] Run `pnpm run dev` - Site loads at http://localhost:3000
- [ ] Run `pnpm run lint` - Only expected warnings
- [ ] Run `pnpm test` - All tests pass
- [ ] Run `pnpm run build` - Build succeeds
- [ ] Run `pnpm run preview` - Built site works

### Test GitHub Pages Deployment

- [ ] Push changes to main branch
- [ ] Check Actions tab - CI workflow passes
- [ ] Check Actions tab - Deploy workflow succeeds
- [ ] Visit GitHub Pages URL - Site loads correctly
- [ ] Verify footer links work
- [ ] Verify policy pages load
- [ ] Test cookie consent banner

### Verify Security Features

- [ ] Check Security tab - CodeQL scans are running
- [ ] Check Security tab - Dependabot alerts enabled
- [ ] Open test PR - Branch protection rules enforced

---

## Need Help?

- **Complete Guide**: [TEMPLATE_USAGE.md](./TEMPLATE_USAGE.md)
- **Report Issues**: [GitHub Issues](https://github.com/FreeForCharity/FFC-IN-Footer_Only_Template/issues)
- **Documentation**: Review all `.md` files in repository root
