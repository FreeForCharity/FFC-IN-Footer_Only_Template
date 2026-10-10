# Threat Model

Security threat model for **FFC-IN-Footer_Only_Template**, the default website
template of Free For Charity (FFC). It covers what the template ships, where
untrusted input enters, the threats that matter, and how they are mitigated
today.

A machine-oriented version of the same model, written for automated
vulnerability scanning, lives in
[`.oss-scanner/threat_model.md`](./.oss-scanner/threat_model.md). Keep the two
in step. When either disagrees with the code, the code is right.

## Why this template is security-relevant

This repository is a **template of templates**. FFC's provisioning automation
(workflow 701 in `FreeForCharity/FFC-Cloudflare-Automation`) creates every new
charity site, an `FFC-EX-<domain>` repository, from it. Consequences:

- a defect here is **copied into every site provisioned after it**;
- a fix here does **not** reach sites that already exist. Each fix needs a
  deliberate backport to the `FFC-EX-*` repositories built from the template;
- each site is run by a 501(c)(3) charity whose volunteers edit content but
  do not review code for security.

## System overview

| Part                  | What it is                                                                                                                                                                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Application           | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4; **static export** (`output: 'export'`); see `package.json` for exact versions                                                                                                     |
| Hosting               | GitHub Pages, deployed by `.github/workflows/deploy.yml` after CI succeeds on `main`                                                                                                                                                             |
| Package manager       | pnpm (version pinned by `packageManager`); `pnpm-workspace.yaml` sets a 7-day `minimumReleaseAge` and pnpm 10 blocks dependency lifecycle scripts by default                                                                                     |
| Runtime third parties | Google Tag Manager → GA4, Microsoft Clarity, Meta Pixel. All are gated by the cookie-consent banner and Google Consent Mode v2                                                                                                                   |
| Security headers      | A CSP `<meta http-equiv>` in `src/app/layout.tsx`. GitHub Pages cannot send custom response headers; `public/_headers` holds the full header set for a future Cloudflare Pages deploy, and `check:drift` keeps its CSP in sync with the meta tag |
| Disclosure            | `security.txt` (`public/` and `public/.well-known/`), `/vulnerability-disclosure-policy`, `/security-acknowledgements`                                                                                                                           |

There is no server, database, user account, form handler or API. All content
is fixed at build time.

## Trust boundaries and untrusted input

1. **Visitor's browser state.** The consent banner reads `localStorage` and
   the `cookie-consent` cookie, and builds cookie `domain=` values from
   `window.location`. Cookies can be planted by a sibling subdomain on shared
   hosts such as `*.github.io`, so stored consent is parsed and validated, never
   trusted.
2. **Volunteer-authored content (semi-trusted).** `src/lib/site.config.ts`,
   `src/lib/analytics.config.ts`, and `src/data/team/*.json` arrive by reviewed
   PR. Values reach HTML, `href`/`src` attributes, and, for `GTM_ID`, an inline
   `<script>`. `check:site-config`, `check:drift`, and `check:rebrand` validate
   them in CI.
3. **Third-party scripts.** GTM and the tags it loads run with full page
   privileges by design. The CSP limits _which_ origins may run script.
4. **CI/CD.** Fork PRs run CI with a read-only token. `deploy.yml`,
   `lighthouse.yml`, and `post-deploy-smoke.yml` run on `workflow_run`.
   `deploy.yml` holds `pages: write` and `id-token: write`, and builds from
   the checked-out `main`, never from a PR artifact.
5. **Dependencies.** The npm registry, via the committed `pnpm-lock.yaml`.

## Threats and mitigations

| ID  | Threat                                                                                        | Impact   | Current mitigations                                                                                                                                                          | Residual |
| --- | --------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| T1  | XSS via volunteer-authored config/data (e.g. a `javascript:` URL, a crafted `GTM_ID`)         | High     | React escaping; config validation in `check:site-config`/`check:drift`; CSP `object-src 'none'`, `base-uri 'self'`; unit tests on config                                     | Medium   |
| T2  | XSS or consent tampering via planted cookie/`localStorage` values                             | Medium   | Stored consent is JSON-parsed and shape-validated; invalid data re-shows the banner; Jest coverage in `__tests__/`                                                           | Low      |
| T3  | Consent bypass: analytics or marketing cookies set, or identifying hits sent, after a decline | High     | Consent Mode v2 regional defaults load before GTM; `update` is pushed before GA config; non-granted cookies are expired on every apply; Playwright `cookie-consent.spec.ts`  | Low      |
| T4  | `'unsafe-inline'` in `script-src` turns any HTML injection into script execution              | High     | Known trade-off: no per-request nonces on GitHub Pages. Defence is T1/T2 input handling                                                                                      | Medium   |
| T5  | Compromised or malicious dependency                                                           | Critical | Lockfile; `minimumReleaseAge` 7 days; lifecycle scripts blocked; daily `pnpm audit` (`security-audit.yml`); Dependabot (npm, Actions, scanner base image)                    | Medium   |
| T6  | CI injection or token abuse from a fork PR or `workflow_run`                                  | Critical | `pull_request` (not `pull_request_target`); least-privilege `permissions:`; deploy only from `main` after CI success; OpenSSF Scorecard tracks token permissions and pinning | Low      |
| T7  | Unreviewed change reaches `main` (account takeover, social engineering)                       | Critical | `main` ruleset (see [SECURITY.md](./SECURITY.md)): PRs, required status checks and code scanning, signed commits, no force-push/deletion                                     | Medium   |
| T8  | Template defect propagates to every provisioned charity site                                  | High     | This model; OSS Scanner enrollment (below); fixes tracked for backport across `FFC-EX-*` sites                                                                               | Medium   |
| T9  | Third-party script compromise (GTM or a tag it loads)                                         | High     | Consent gating; CSP origin allowlist; no secrets or PII in the page for a script to steal                                                                                    | Medium   |
| T10 | Domain or DNS takeover of a charity site                                                      | Critical | Out of this repo: domains are in FFC's Cloudflare account, managed from `FFC-Cloudflare-Automation`; HTTPS enforced by GitHub Pages                                          | Low      |
| T11 | Stale `security.txt` stops researchers from reaching us                                       | Low      | `security-txt-expiry.yml` checks the `Expires` field weekly                                                                                                                  | Low      |

## Verification in place

- **CI** (`ci.yml`): format, lint, Jest unit tests, static build, Playwright e2e
  (sharded).
- **Guards**: `check:drift` (kebab-case routes, `assetPath`, CSP sync, secret
  patterns, placeholder URLs), `check:site-config`, `check:rebrand`.
- **Code scanning**: CodeQL default setup (`javascript-typescript`, `actions`) on every PR.
- **Supply chain**: `security-audit.yml` (`pnpm audit`, daily and on lockfile
  changes); Dependabot; **OpenSSF Scorecard** (`scorecard.yml`, results in code
  scanning and published to the OpenSSF API).
- **Automated vulnerability scanning**: enrollment in
  [Anthropic OSS Scanner](https://github.com/anthropics/oss-scanner) is
  prepared under [`.oss-scanner/`](./.oss-scanner/README.md).
  `oss-scanner-image.yml` proves the scanner image builds and its tests pass
  with no network. Tracking: FreeForCharity/FFC-Cloudflare-Automation#1582.

## Out of scope

The security of visitors' devices and networks, GitHub's and Google's
infrastructure, charities' social-media and email accounts, and physical
security. DNS and domain security are covered in
`FreeForCharity/FFC-Cloudflare-Automation`.

## Reporting

See [SECURITY.md](./SECURITY.md#reporting-a-vulnerability). Do not report
vulnerabilities in public issues.

## Review

Review this model when the architecture changes (hosting, a new third-party
integration, a new data source), after any security incident, when an
automated-scanner report reveals a threat missing here, and at least annually.

**Last reviewed:** 2026-10-09 · **Next review due:** 2027-10-09
