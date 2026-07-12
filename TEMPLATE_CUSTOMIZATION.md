# Customizing a Site Built From This Template

This footer-only template is designed so a brand-new Free For Charity (FFC)
site can be stood up by editing a small, well-defined set of files. Everything
else flows from there, and CI guards against accidental drift from FFC best
practices.

If you are starting fresh, run through the checklist in
[`TEMPLATE_SETUP_CHECKLIST.md`](./TEMPLATE_SETUP_CHECKLIST.md). This document
is the **map** — what changes where, and why.

> The `SiteConfig` shape here is intentionally identical to the FFC Single
> Page template (`FFC-IN-FFC_Single_Page_Template`), so a config written for
> one template can be transcribed directly into the other. See the doc comment
> at the top of [`src/lib/site.config.ts`](./src/lib/site.config.ts) for the
> few keys this template omits.

## The one file you must edit

[`src/lib/site.config.ts`](./src/lib/site.config.ts) is the central source of
truth for site-specific values. Update the `siteConfig` export with your
charity's name, URL, contact email, social links, etc.

| Property                      | Where it shows up                                                                                                                                                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `name`                        | `<title>`, OG/Twitter `site_name`, footer EIN line, footer policy-column heading and policy-link labels, footer copyright, manifest                                                                                      |
| `tagline`                     | Default `<title>` and OG title                                                                                                                                                                                           |
| `description`                 | `<meta description>` (long form for search engines), manifest fallback                                                                                                                                                   |
| `shortDescription`            | OG / Twitter card description (tuned for social previews; falls back to `description`)                                                                                                                                   |
| `url`                         | `metadataBase`, sitemap entries, robots `Sitemap:` line                                                                                                                                                                  |
| `twitterHandle`               | Twitter card `site` attribute (the leading `@` is added automatically)                                                                                                                                                   |
| `contactEmail`                | Footer e-mail link. `security.txt` has its own `Contact:` line — keep them in sync.                                                                                                                                      |
| `keywords`                    | `<meta keywords>`                                                                                                                                                                                                        |
| `themeColor`                  | Web manifest `theme_color` and `background_color`                                                                                                                                                                        |
| `vulnerabilityDisclosurePath` | Vulnerability disclosure link target                                                                                                                                                                                     |
| `social`                      | Footer social-link rail (icon resolved by `label`: Facebook, X (Twitter), LinkedIn, GitHub)                                                                                                                              |
| `ein`                         | Footer EIN display line                                                                                                                                                                                                  |
| `phone`                       | Footer phone link (`phone.display` shown, `phone.tel` used for the `tel:` link)                                                                                                                                          |
| `addresses`                   | Footer contact column (`addresses[].label` / `.lines` / `.mapUrl`)                                                                                                                                                       |
| `guidestar`                   | Footer GuideStar/Candid seal links (`guidestar.profileUrl`, `guidestar.directProfileUrl`)                                                                                                                                |
| `supportedBy`                 | Permanent "Supported by Free For Charity" bottom-bar attribution and "Supported Charity Login" quick link. Part of the FFC footer standard: required, always rendered — do **not** change or remove it when customizing. |
| `parentOrg`                   | Footer "a project of" parent-org clause (omit for a standalone charity)                                                                                                                                                  |

### Things `siteConfig` does NOT drive

- **Footer quick-link labels/anchors** — the `Quick Links` list lives inline in
  [`src/components/footer/index.tsx`](./src/components/footer/index.tsx)
  (matching the Single Page template). Edit those labels and anchors to match
  your own site's sections; the `Supported Charity Login` entry stays.
- **The FFC donation policy link** — the footer's
  `Free For Charity Donation Policy` entry (`/free-for-charity-donation-policy`)
  keeps FFC's name on purpose: that page documents FFC's own policy. The
  adjacent `Donation Policy` entry (`/donation-policy`) is YOUR charity's
  policy — edit that page's content instead.
- **GitHub Pages base path** — chosen automatically by the deploy workflow
  based on whether `public/CNAME` exists. No manual workflow edit required.
- **GTM container ID** — lives in
  `src/components/google-tag-manager/index.tsx`. Leaving it as `GTM-TQ5H8HPR`
  sends your analytics to Free For Charity — replace it early.
- **E2E test expectations** — content-specific test values live in
  [`tests/test.config.ts`](./tests/test.config.ts); update them alongside your
  content edits.

After editing, **run `npm run check:drift`** to confirm nothing else still
references the old placeholder values.

### Are you done rebranding? — `npm run check:rebrand`

Run **`npm run check:rebrand`** at any point to get a checklist of every value
that still matches the Free For Charity template defaults — charity name, EIN,
phone, contact email, domain/CNAME, the GTM analytics container, and the sample
team content. It is a guide, not a gate: it always exits 0 on the template
itself (the canonical repo intentionally keeps FFC's values), so it never
blocks a PR. If your fork wants to _enforce_ "fully rebranded before deploy",
wire `node scripts/rebrand-check.mjs --strict` (which exits non-zero while any
default remains) into your own CI.

The permanent `supportedBy` attribution is deliberately excluded from the
checklist — it is part of the FFC footer standard, not a rebrand target.

## Files you'll likely touch when rebranding

| File                                                            | What to change                                                                                                                                                                                                    |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `public/CNAME`                                                  | Custom domain (delete if using only github.io)                                                                                                                                                                    |
| `public/.well-known/security.txt` **and** `public/security.txt` | `Contact`, `Canonical`, `Policy`, `Acknowledgments`, `Expires`. **Both copies must stay in sync** (the drift checker enforces it). The root copy exists because GitHub Pages does not serve dot-prefixed folders. |
| `public/Images/*`, `public/Svgs/*`                              | Brand assets (keep filenames where possible)                                                                                                                                                                      |
| `src/components/footer/index.tsx`                               | Quick-link labels/anchors only — EIN, addresses, phone, GuideStar links, social rail, and email all read from `siteConfig`.                                                                                       |
| `src/data/team/*`                                               | Team — your real people                                                                                                                                                                                           |
| `src/app/privacy-policy/page.tsx` etc                           | Legal pages (have a lawyer review)                                                                                                                                                                                |
| `tests/test.config.ts`                                          | E2E expectations for your content                                                                                                                                                                                 |

The web manifest is **auto-generated** from `siteConfig` at build time by
`src/app/manifest.ts` — no separate file to edit.

## Files you should NOT touch on a per-site basis

These are part of the platform contract. Touching them often means you are
drifting from FFC best practices and CI will catch it:

- `scripts/check-drift.mjs` — best-practice enforcement
- `scripts/rebrand-check.mjs` — rebrand checklist
- `.github/workflows/*.yml` — CI / deploy / security workflows
- `next.config.ts` `output: 'export'` line — static export is required for GitHub Pages
- `src/lib/assetPath.ts` — the helper everyone depends on

If you have a real need to change one of these, open an issue first.
