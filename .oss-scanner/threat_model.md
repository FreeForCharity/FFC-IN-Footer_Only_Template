# Threat model — FFC-IN-Footer_Only_Template

Written for Anthropic OSS Scanner, and kept in step with the human-facing
[`THREAT-MODEL.md`](../THREAT-MODEL.md). If they disagree, the code is right and
both documents need fixing.

## What this project does

This is the default website template of [Free For Charity](https://freeforcharity.org)
(FFC), a nonprofit that builds free websites for 501(c)(3) charities. Every new
charity site, an `FFC-EX-<domain>` repository, is created **from this
repository**. That makes this a template of templates: a defect here is copied
into every site provisioned after it, and it is **not** fixed in sites that
already exist unless someone backports the fix. More than 100 charity sites
come from this template or its sibling `FFC-IN-FFC_Single_Page_Template`.

The product is a **static export** (`next build` with `output: 'export'`)
served by GitHub Pages. There is no server, no database, no login, no form
handler, and no API. What ships:

- a footer with the charity's contact, social links, donation link and legal
  identity (EIN, supporting-org disclosure), driven by `src/lib/site.config.ts`
- policy pages (privacy, cookie, terms, donation, vulnerability disclosure,
  security acknowledgements) rendered from the same config
- a cookie-consent banner that implements Google Consent Mode v2 and gates
  Google Tag Manager, GA4, Microsoft Clarity and the Meta Pixel
- a team section rendered from `src/data/team/*.json`
- `security.txt`, a CSP `<meta>` tag, and `public/_headers` (for a future
  Cloudflare Pages deploy; GitHub Pages ignores it)

## Where untrusted input enters

Ranked by how much we care:

1. **The visitor's browser state, read by client code at runtime.** This is
   the primary runtime surface.
   - `localStorage['cookie-consent']` and the `cookie-consent` cookie are parsed
     and validated in `src/components/cookie-consent/index.tsx`. Cookies can be
     planted by a sibling subdomain on shared hosts, for example
     `*.github.io` or a charity's other subdomains.
   - `window.location` (hostname, protocol, path, query, hash) is used to build
     cookie `domain=` attributes and paths.
   - Anything the Consent Mode bootstrap (`src/lib/consent-mode.ts`, inlined in
     `src/app/layout.tsx` via `dangerouslySetInnerHTML`) reads before React
     loads.
2. **Build-time content authored by charity volunteers.** This is semi-trusted.
   It arrives by PR and is reviewed, but reviewers are volunteers and do not
   audit for injection. It covers `src/lib/site.config.ts`,
   `src/lib/analytics.config.ts` (the `GTM_ID` is interpolated into an inline
   `<script>`), `src/data/team/*.json`, and image/URL fields. Any path where a
   config or data value reaches HTML, a `<script>` body, an `href`/`src`
   (`javascript:` URLs), a CSP directive or JSON-LD **without** escaping or
   validation is in scope. `scripts/check-site-config.mjs` and
   `scripts/check-drift.mjs` are meant to catch these at CI time, so a bypass of
   those guards is in scope too.
3. **CI and supply chain.** `.github/workflows/*.yml`, especially anything
   triggered by `pull_request` from forks or by `workflow_run` (`deploy.yml`,
   `lighthouse.yml`, `post-deploy-smoke.yml`). Look for script injection from
   PR titles, branch names or artifacts, over-broad `GITHUB_TOKEN` permissions,
   and unpinned or mutable actions. Also the Node scripts in `scripts/` that run
   on PR content, and the pnpm supply-chain controls in `pnpm-workspace.yaml`
   (`minimumReleaseAge`, blocked lifecycle scripts).

## Components that matter most / least

- **Most:** `src/components/cookie-consent/`, `src/lib/consent-mode.ts`,
  `src/components/google-tag-manager/`, `src/app/layout.tsx` (CSP meta and
  inline scripts), `src/components/footer/`, `src/components/policy/`,
  `src/lib/site.config.ts` and its consumers, `scripts/check-*.mjs`,
  `.github/workflows/`.
- **Less:** fonts, images, Tailwind styling, the Lighthouse configuration.
- **Out of scope:** third-party code we load by design (Google Tag Manager,
  GA4, Clarity, Meta Pixel). Report a CSP that lets *other* origins run script,
  not the fact that GTM can run script. GitHub Pages hosting behavior (no
  custom response headers) is a known platform limit, documented in
  `public/_headers`. `node_modules/` is in scope only where *our* configuration
  makes a known-vulnerable path reachable.

## How to exercise it

- `pnpm test` runs the Jest unit tests in `__tests__/`, including consent
  parsing and config validation.
- `pnpm run build` writes the static site to `out/`. That is exactly what
  ships, so inspect the emitted HTML for injected markup.
- `pnpm run test:e2e` runs Playwright in `tests/` against `out/`, served
  locally. Chromium is installed in the image.
- `pnpm run check:drift`, `pnpm run check:site-config` and
  `pnpm run check:rebrand` are the CI guards for config and content.

## How we rate severity

There is no server-side state and no credentials in the shipped site, so
impact is measured against **visitors** and **the integrity of the published
site**:

- **Critical:** script execution in a visitor's browser on a default-config
  build (stored or reflected XSS). Also any path that lets an outside
  contributor's PR change what is deployed or obtain a write token
  (CI injection, `pull_request_target`/`workflow_run` misuse).
- **High:** XSS that needs a malicious but plausible config/data value, given
  that config is volunteer-authored. Consent bypass that sets analytics or
  marketing cookies, or sends identifying hits, after a visitor declined. A
  CSP weakness that admits script from an origin we did not list.
- **Medium:** consent-state tampering that only affects the visitor's own
  choice, open redirects, clickjacking on pages that matter, and supply-chain
  weaknesses that need an upstream compromise first.
- **Low:** information disclosure of already-public data (EIN, addresses,
  contact emails are public by design), and missing hardening with no
  demonstrated exploit.

## Anything to leave alone

- `'unsafe-inline'` in `script-src` is a known, documented trade-off: static
  export plus GTM, with no per-request nonces on GitHub Pages. Report a
  concrete injection that reaches it, not its presence.
- The FFC identity in the template (names, EIN 46-2471893, the template's GTM
  container) is intentional sample data that each fork replaces;
  `check:rebrand` enforces this.
- Public contact details in `security.txt`, the footer, and the policy pages
  are intended to be public.

## Reports and patches

Reports go to the address in `.oss-scanner/project.yaml`. Please include a
minimal reproducer (a config value or URL plus the resulting `out/` HTML or
browser behavior) and a patch against `main`. Confirmed issues are fixed in this
template first and then backported to the charity sites built from it.
