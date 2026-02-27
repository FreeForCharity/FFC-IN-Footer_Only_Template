# Template Setup Checklist

Quick reference checklist for setting up a new repository from the FFC Footer-Only Template.

**For complete instructions, see [TEMPLATE_USAGE.md](./TEMPLATE_USAGE.md)**

---

## Initial Repository Creation

- [ ] Click "Use this template" button on GitHub
- [ ] Create new repository with kebab-case name
- [ ] Add repository description and topics
- [ ] Clone repository locally
- [ ] Run `npm install` to verify dependencies
- [ ] Run `npm run build` to verify build works
- [ ] Run `npm run dev` to test locally

---

## Essential GitHub Settings (Required)

### General Settings (Settings -> General)

- [ ] Set repository description
- [ ] Add topics (nextjs, nonprofit, static-site, footer-template, etc.)
- [ ] Enable Issues
- [ ] Enable Discussions (optional)

### GitHub Pages (Settings -> Pages)

- [ ] Source: Deploy from a branch
- [ ] Branch: Select `gh-pages` and `/ (root)`
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
- [ ] Enable Code scanning (CodeQL) - auto-configured by workflow
- [ ] Enable Secret scanning (if available)

---

## Branch Protection Rules (Settings -> Rules -> Rulesets)

Create ruleset named "Protect Main":

- [ ] Target branches: Include default branch (main)
- [ ] Restrict deletions
- [ ] Require pull request before merging
- [ ] Require status checks to pass:
  - [ ] Test and Build (CI workflow)
  - [ ] Analyze (javascript-typescript)
  - [ ] Analyze (actions)
- [ ] Require branches to be up to date
- [ ] Require signed commits
- [ ] Block force pushes

---

## Update Repository Configuration Files

### Update basePath in Workflows

- [ ] Edit `.github/workflows/deploy.yml` - change `/FFC_Single_Page_Template` to `/YOUR-REPO-NAME`
- [ ] Edit `.github/workflows/lighthouse.yml` - change `/FFC_Single_Page_Template` to `/YOUR-REPO-NAME`
- [ ] OR remove `NEXT_PUBLIC_BASE_PATH` if using custom domain

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

### Contact Information

- [ ] Update `src/components/footer/index.tsx` - Footer contact details
- [ ] Update `SECURITY.md` - Security contact
- [ ] Update `CODE_OF_CONDUCT.md` - Conduct reporting contact
- [ ] Update `SUPPORT.md` - Support resources

### Branding Assets

- [ ] Replace `/public/logo.svg` with your logo
- [ ] Replace `/public/favicon.ico` with your favicon
- [ ] Update Open Graph images (if present)
- [ ] Update color scheme in `src/app/globals.css`
- [ ] Update fonts in `src/lib/fonts.ts` (if needed)

### Content Data

- [ ] Update team members in `src/data/team/`
- [ ] Update team photos in `/public/team/`

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

- [ ] Run `npm run dev` - Site loads at http://localhost:3000
- [ ] Run `npm run lint` - Only expected warnings
- [ ] Run `npm test` - All tests pass
- [ ] Run `npm run build` - Build succeeds
- [ ] Run `npm run preview` - Built site works

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
- **Report Issues**: [GitHub Issues](https://github.com/FreeForCharity/FFC-IN-Footer-Only-Template/issues)
- **Documentation**: Review all `.md` files in repository root
