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

| Property                      | Where it shows up                                                                                                                                                                                                                                            |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `name`                        | `<title>`, OG/Twitter `site_name`, footer mission line, EIN line, policy-column heading and policy-link labels, footer copyright, team section heading, donation policy, manifest                                                                            |
| `tagline`                     | Default `<title>` and OG title                                                                                                                                                                                                                               |
| `mission`                     | One-sentence mission shown under the charity name at the top of the footer on every page, and in the donation policy's "Use of Donations"                                                                                                                    |
| `donationUrl`                 | Footer **Donate** quick link (https). Empty = a `mailto:` to `contactEmail`                                                                                                                                                                                  |
| `volunteerUrl`                | Footer **Volunteer** quick link (https). Empty = a `mailto:` to `contactEmail`                                                                                                                                                                               |
| `description`                 | `<meta description>` (long form for search engines), manifest fallback                                                                                                                                                                                       |
| `shortDescription`            | OG / Twitter card description (tuned for social previews; falls back to `description`)                                                                                                                                                                       |
| `url`                         | `metadataBase`, sitemap entries, robots `Sitemap:` line                                                                                                                                                                                                      |
| `twitterHandle`               | Twitter card `site` attribute (the leading `@` is added automatically)                                                                                                                                                                                       |
| `contactEmail`                | Footer e-mail link. `security.txt` has its own `Contact:` line — keep them in sync.                                                                                                                                                                          |
| `keywords`                    | `<meta keywords>`                                                                                                                                                                                                                                            |
| `themeColor`                  | Web manifest `theme_color` and `background_color`                                                                                                                                                                                                            |
| `vulnerabilityDisclosurePath` | Vulnerability disclosure link target                                                                                                                                                                                                                         |
| `social`                      | Footer social-link rail (icon resolved by `label`: Facebook, X (Twitter), LinkedIn, GitHub)                                                                                                                                                                  |
| `ein`                         | Footer EIN display line                                                                                                                                                                                                                                      |
| `phone`                       | Footer phone link (`phone.display` shown, `phone.tel` used for the `tel:` link)                                                                                                                                                                              |
| `addresses`                   | Footer contact column (`addresses[].label` / `.lines` / `.mapUrl`)                                                                                                                                                                                           |
| `taxStatusLabel`              | Footer copyright tax-status clause (e.g. `a US 501c3 Non Profit`) and the donation policy's tax-deductibility sentence. A legal claim: set `''` until the organization holds IRS 501(c)(3) recognition, and both are replaced by a "not yet recognized" note |
| `guidestar`                   | Footer GuideStar/Candid seal links (`guidestar.profileUrl`, `guidestar.directProfileUrl`)                                                                                                                                                                    |
| `supportedBy`                 | Permanent "Supported by Free For Charity" bottom-bar attribution and "Supported Charity Login" quick link. Part of the FFC footer standard: required, always rendered — do **not** change or remove it when customizing.                                     |
| `parentOrg`                   | Footer "a project of" parent-org clause (omit for a standalone charity)                                                                                                                                                                                      |

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
  `src/lib/analytics.config.ts`. Leaving it as `GTM-TQ5H8HPR`
  sends your analytics to Free For Charity — replace it early. Setting it to
  the empty string is supported and means "no container yet": both GTM
  components then render nothing, instead of emitting a tag that requests
  `gtm.js?id=` and fails in the browser.
- **Phone number** — `siteConfig.phone` may be left as two empty strings if
  your charity publishes no phone number. The footer then omits the "Call Us
  Today" block entirely. Do **not** put a placeholder there: it ships as a
  `tel:` link that looks callable and dials nothing.
- **Footer quick links** — the list in `src/components/footer/index.tsx` must
  only contain destinations your site actually serves. Add an entry per section
  or route you add.
- **Tests need no edits to survive a rebrand.** Both suites read your values
  from `src/lib/site.config.ts` and `src/data/team/`, so changing your name,
  EIN, contact details, socials or roster does not turn them red. The only
  content-specific test file is
  [`tests/test.config.ts`](./tests/test.config.ts), and it now derives from
  `site.config.ts` too.

  If a test does fail after a rebrand, treat it as a real finding rather than
  something to update: until #146 the suites asserted Free For Charity's own
  identity literally, so a _correct_ rebrand failed 44 of them and a finished
  site was indistinguishable from a broken one.

After editing, **run `pnpm run check:drift`** to confirm nothing else still
references the old placeholder values.

### Are you done rebranding? — `pnpm run check:rebrand`

Run **`pnpm run check:rebrand`** at any point to get a checklist of every value
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
