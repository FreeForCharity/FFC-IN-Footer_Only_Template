import { spawnSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { githubPagesProjectPath } from '../helpers/githubPagesProjectPath'

const syncedCsp =
  "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https://www.googletagmanager.com; frame-src https://www.googletagmanager.com; media-src 'self' blob: https:; object-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests"

// Read from scripts/check-drift.mjs, the copy of this value the script itself
// uses, so the fixture stays correct on any fork. Hardcoding the template's
// own project path here is what made this suite fail on a correct rebrand.
const projectPath = githubPagesProjectPath()

/**
 * One deploy serves one origin+prefix, so the payload takes the prefix rather
 * than listing both variants. `origin` varies too: the CNAME cases below need
 * a payload on the custom domain with no base path.
 */
function payload(
  expires = '2027-12-31T00:00:00.000Z',
  { origin = 'https://ffcworkingsite1.org', prefix = projectPath } = {}
): string {
  return [
    'Contact: mailto:clarkemoyer@freeforcharity.org',
    `Expires: ${expires}`,
    'Preferred-Languages: en',
    `Canonical: ${origin}${prefix}/.well-known/security.txt`,
    `Canonical: ${origin}${prefix}/security.txt`,
    `Policy: ${origin}${prefix}/vulnerability-disclosure-policy`,
    `Acknowledgments: ${origin}${prefix}/security-acknowledgements`,
    '',
  ].join('\n')
}

function makeFixture(
  overrides: Partial<
    Record<
      'headers' | 'layout' | 'siteConfig' | 'wellKnown' | 'rootSecurity' | 'cname',
      string | null
    >
  > = {}
) {
  const dir = mkdtempSync(join(tmpdir(), 'ffc-drift-'))
  mkdirSync(join(dir, 'scripts'), { recursive: true })
  mkdirSync(join(dir, 'src/app'), { recursive: true })
  mkdirSync(join(dir, 'src/lib'), { recursive: true })
  mkdirSync(join(dir, 'public/.well-known'), { recursive: true })
  cpSync(join(process.cwd(), 'scripts/check-drift.mjs'), join(dir, 'scripts/check-drift.mjs'))

  const files = {
    headers: [
      '/*',
      '  X-Frame-Options: SAMEORIGIN',
      `  Content-Security-Policy: ${syncedCsp}; frame-ancestors 'self'`,
      '',
    ].join('\n'),
    layout: [
      'export default function RootLayout() {',
      '  return (',
      '    <html><head>',
      `      <meta httpEquiv="Content-Security-Policy" content="${syncedCsp}" />`,
      '    </head><body /></html>',
      '  )',
      '}',
      '',
    ].join('\n'),
    siteConfig:
      "export const siteConfig = { url: 'https://ffcworkingsite1.org', vulnerabilityDisclosurePath: '/vulnerability-disclosure-policy' }\n",
    wellKnown: payload(),
    rootSecurity: payload(),
    // No public/CNAME by default: that is the state a freshly provisioned
    // charity repo is in, and the state the deploy reads as "project path".
    cname: null,
    ...overrides,
  }

  if (files.headers !== null) writeFileSync(join(dir, 'public/_headers'), files.headers)
  if (files.layout !== null) writeFileSync(join(dir, 'src/app/layout.tsx'), files.layout)
  if (files.siteConfig !== null)
    writeFileSync(join(dir, 'src/lib/site.config.ts'), files.siteConfig)
  if (files.wellKnown !== null)
    writeFileSync(join(dir, 'public/.well-known/security.txt'), files.wellKnown)
  if (files.rootSecurity !== null)
    writeFileSync(join(dir, 'public/security.txt'), files.rootSecurity)
  if (files.cname !== null) writeFileSync(join(dir, 'public/CNAME'), files.cname)

  return dir
}

function runDrift(dir: string) {
  // Both streams, always. The script prints errors AND warnings to stderr
  // (console.error / console.warn) and only the summary line to stdout, so
  // reading stdout alone on the success path makes every warning assertion
  // fail vacuously — and makes a "does not contain" assertion pass for the
  // wrong reason, which is the more dangerous half.
  const result = spawnSync('node', ['scripts/check-drift.mjs'], {
    cwd: dir,
    encoding: 'utf8',
  })
  return {
    status: result.status ?? 1,
    output: `${result.stdout ?? ''}${result.stderr ?? ''}`,
  }
}

describe('security drift guard', () => {
  let fixtures: string[] = []

  afterEach(() => {
    for (const fixture of fixtures) rmSync(fixture, { recursive: true, force: true })
    fixtures = []
  })

  // public/_headers is a Cloudflare Pages / Netlify build feature and is inert
  // on the stack FFC deploys — a GitHub Pages origin behind the Cloudflare
  // proxy, neither of which reads it (measured in
  // FFC-Cloudflare-Automation#884). So its absence changes nothing that is
  // served and must not fail the run, and must never mask the finding about
  // the layout.tsx CSP meta tag, which is the only header actually served.
  it('warns rather than fails when public/_headers is missing', () => {
    const dir = makeFixture({ headers: null })
    fixtures.push(dir)

    const result = runDrift(dir)

    expect(result.output).toContain('public/_headers is missing')
    expect(result.output).toContain('inert on FFC deploys')
    expect(result.output).not.toContain('security headers will not be served')
    expect(result.status).toBe(0)
  })

  // The warning severity above is correct only for a genuinely absent file. A
  // file that exists but cannot be read is a different fact: reporting it as
  // missing sends the reader to restore a file they already have, and — because
  // absent is only a warning — would let the run pass on a filesystem error.
  it('errors, not warns, when public/_headers exists but cannot be read', () => {
    const dir = makeFixture({ headers: null })
    fixtures.push(dir)
    // A directory where the file should be: readFile gives EISDIR, which is
    // portable and needs no chmod (root ignores permission bits in CI).
    mkdirSync(join(dir, 'public/_headers'))

    const result = runDrift(dir)

    expect(result.output).toContain('Could not read public/_headers')
    expect(result.output).not.toContain('public/_headers is missing')
    expect(result.status).not.toBe(0)
  })

  // Unreadable is the fourth state _headers can be in, and it must obey the
  // same rule as the other three: never end the check before the layout CSP has
  // been assessed. The run fails either way, so the cost is not a silent pass —
  // it is a reader who fixes the read error, re-runs, and only then learns the
  // site has no CSP.
  it('still reports the missing live CSP alongside an unreadable _headers', () => {
    const dir = makeFixture({
      headers: null,
      layout: 'export default function RootLayout() {\n  return <html><body /></html>\n}\n',
    })
    fixtures.push(dir)
    mkdirSync(join(dir, 'public/_headers'))

    const result = runDrift(dir)

    expect(result.output).toContain('Could not read public/_headers')
    expect(result.output).toContain('src/app/layout.tsx has no Content-Security-Policy meta tag')
    expect(result.status).not.toBe(0)
  })

  it('warns rather than fails when public/_headers carries no CSP', () => {
    const dir = makeFixture({ headers: '/*\n  X-Frame-Options: SAMEORIGIN\n' })
    fixtures.push(dir)

    const result = runDrift(dir)

    expect(result.output).toContain('public/_headers has no Content-Security-Policy directive')
    expect(result.status).toBe(0)
  })

  // A matrix rather than one case: the risk lives in the early returns, so a
  // regression would only show up in the _headers states that return before
  // reaching the layout check.
  const headersStates: Array<[string, string | null]> = [
    ['absent', null],
    ['present without a CSP', '/*\n  X-Frame-Options: SAMEORIGIN\n'],
    ['present with a CSP', `/*\n  Content-Security-Policy: ${syncedCsp}\n`],
  ]

  it.each(headersStates)(
    'fails on a missing layout CSP meta tag when _headers is %s',
    (_label, headers) => {
      const dir = makeFixture({
        headers,
        layout: 'export default function RootLayout() {\n  return <html><body /></html>\n}\n',
      })
      fixtures.push(dir)

      const result = runDrift(dir)

      expect(result.output).toContain('src/app/layout.tsx has no Content-Security-Policy meta tag')
      expect(result.status).not.toBe(0)
    }
  )

  it('fails when root and well-known security.txt payloads drift', () => {
    const dir = makeFixture({ rootSecurity: payload('2028-01-01T00:00:00.000Z') })
    fixtures.push(dir)

    const result = runDrift(dir)

    expect(result.status).not.toBe(0)
    expect(result.output).toContain('public/security.txt and public/.well-known/security.txt')
  })

  it('fails when siteConfig.url is not a bare https origin', () => {
    const dir = makeFixture({
      siteConfig:
        "export const siteConfig = { url: 'http://ffcworkingsite1.org/path/', vulnerabilityDisclosurePath: '/vulnerability-disclosure-policy' }\n",
    })
    fixtures.push(dir)

    const result = runDrift(dir)

    expect(result.status).not.toBe(0)
    expect(result.output).toContain('siteConfig.url')
    expect(result.output).toContain('must start with "https://"')
  })

  // siteConfig.url is the ORIGIN; sitePath() supplies the GitHub Pages base
  // path, and deploy.yml derives that base path from public/CNAME alone. So
  // the two have to move together. The failure this guards is silent: both
  // halves are individually well-formed and the build never complains, but
  // siteUrl() then emits `https://custom.example/<repo>/page/` — an address
  // neither the custom domain nor github.io serves.
  const rebrandedConfig = (url: string) =>
    `export const siteConfig = { url: '${url}', vulnerabilityDisclosurePath: '/vulnerability-disclosure-policy' }\n`

  it('fails when siteConfig.url names a custom domain but there is no CNAME', () => {
    const dir = makeFixture({
      siteConfig: rebrandedConfig('https://charity.example'),
      wellKnown: payload(undefined, { origin: 'https://charity.example' }),
      rootSecurity: payload(undefined, { origin: 'https://charity.example' }),
    })
    fixtures.push(dir)

    const result = runDrift(dir)

    expect(result.status).not.toBe(0)
    expect(result.output).toContain('there is no public/CNAME')
    expect(result.output).toContain(`https://charity.example${projectPath}/...`)
  })

  it('fails when public/CNAME and siteConfig.url name different hosts', () => {
    const dir = makeFixture({
      cname: 'charity.example\n',
      siteConfig: rebrandedConfig('https://freeforcharity.github.io'),
      wellKnown: payload(undefined, { origin: 'https://freeforcharity.github.io', prefix: '' }),
      rootSecurity: payload(undefined, { origin: 'https://freeforcharity.github.io', prefix: '' }),
    })
    fixtures.push(dir)

    const result = runDrift(dir)

    expect(result.status).not.toBe(0)
    expect(result.output).toContain('public/CNAME points at "charity.example"')
  })

  it('accepts a custom domain when the CNAME and the origin agree', () => {
    const dir = makeFixture({
      cname: 'charity.example\n',
      siteConfig: rebrandedConfig('https://charity.example'),
      wellKnown: payload(undefined, { origin: 'https://charity.example', prefix: '' }),
      rootSecurity: payload(undefined, { origin: 'https://charity.example', prefix: '' }),
    })
    fixtures.push(dir)

    const result = runDrift(dir)

    expect(result.output).not.toContain('public/CNAME points at')
    expect(result.output).not.toContain('there is no public/CNAME')
    expect(result.status).toBe(0)
  })

  // The un-rebranded template ships no CNAME and keeps the placeholder host.
  // That is not a charity deploy, so the origin rule must stay quiet — the
  // placeholder itself is what checkPlaceholderUrl is for.
  it('stays quiet about the origin while the placeholder host is still in place', () => {
    const dir = makeFixture()
    fixtures.push(dir)

    const result = runDrift(dir)

    expect(result.output).not.toContain('there is no public/CNAME')
    expect(result.status).toBe(0)
  })

  it('requires security.txt to follow the CNAME across the cutover', () => {
    const dir = makeFixture({
      cname: 'charity.example\n',
      siteConfig: rebrandedConfig('https://charity.example'),
      // Left on the project path: the config and CNAME moved, this did not.
      wellKnown: payload(undefined, { origin: 'https://charity.example' }),
      rootSecurity: payload(undefined, { origin: 'https://charity.example' }),
    })
    fixtures.push(dir)

    const result = runDrift(dir)

    expect(result.status).not.toBe(0)
    expect(result.output).toContain(
      'Missing: Canonical: https://charity.example/.well-known/security.txt'
    )
  })

  it('warns about a security.txt line this deploy does not serve', () => {
    const stale = `${payload()}Canonical: https://charity.example/security.txt\n`
    const dir = makeFixture({ wellKnown: stale, rootSecurity: stale })
    fixtures.push(dir)

    const result = runDrift(dir)

    expect(result.output).toContain('which this deploy does not serve')
    expect(result.output).toContain('https://charity.example/security.txt')
    // A leftover line during a cutover is untidy, not broken: the required
    // lines are all present, so this must not fail the build.
    expect(result.status).toBe(0)
  })

  // next/link applies basePath itself. Wrapping its href in sitePath() applies
  // it twice, and every such link 404s on a project-path deploy. This shipped on
  // FFC-EX-neurospike.org with the whole test suite green, because the suite
  // builds with no base path — where sitePath() is the identity function and the
  // doubling cannot happen. Hence a static check rather than another test.
  const navComponent = (href: string) =>
    [
      "import Link from 'next/link'",
      "import { sitePath } from '@/lib/site.config'",
      'export default function Nav() {',
      `  return <Link href={${href}}>Home</Link>`,
      '}',
      '',
    ].join('\n')

  it('fails when a next/link href is wrapped in sitePath()', () => {
    const dir = makeFixture()
    fixtures.push(dir)
    writeFileSync(join(dir, 'src/app/nav.tsx'), navComponent("sitePath('/org-leadership')"))

    const result = runDrift(dir)

    expect(result.status).not.toBe(0)
    expect(result.output).toContain('wraps a next/link href in sitePath()')
    expect(result.output).toContain('applies it twice')
  })

  it('accepts a bare route path on next/link', () => {
    const dir = makeFixture()
    fixtures.push(dir)
    writeFileSync(join(dir, 'src/app/nav.tsx'), navComponent("'/org-leadership'"))

    const result = runDrift(dir)

    expect(result.output).not.toContain('wraps a next/link href')
    expect(result.status).toBe(0)
  })

  // A raw <a> to a file in public/ is exactly what sitePath() is for — Next does
  // not process that href, so the base path must be applied by hand. Flagging it
  // would push authors toward the bug this guard exists to prevent.
  it('does not flag a raw <a> href wrapped in sitePath(), even beside a Link import', () => {
    const dir = makeFixture()
    fixtures.push(dir)
    writeFileSync(
      join(dir, 'src/app/nav.tsx'),
      [
        "import Link from 'next/link'",
        "import { sitePath } from '@/lib/site.config'",
        'export default function Nav() {',
        '  return (',
        '    <div>',
        '      <Link href="/privacy-policy">Privacy</Link>',
        "      <a href={sitePath('/.well-known/security.txt')}>security.txt</a>",
        '    </div>',
        '  )',
        '}',
        '',
      ].join('\n')
    )

    const result = runDrift(dir)

    expect(result.output).not.toContain('wraps a next/link href')
    expect(result.status).toBe(0)
  })

  it('fails when security.txt Expires is regex-shaped but not parseable', () => {
    const dir = makeFixture({
      wellKnown: payload('2027-02-30T00:00:00.000Z'),
      rootSecurity: payload('2027-02-30T00:00:00.000Z'),
    })
    fixtures.push(dir)

    const result = runDrift(dir)

    expect(result.status).not.toBe(0)
    expect(result.output).toContain('not a parseable RFC 3339 datetime')
  })

  it('fails when CSP sources drift between _headers and layout', () => {
    const dir = makeFixture({
      headers: [
        '/*',
        '  X-Frame-Options: SAMEORIGIN',
        `  Content-Security-Policy: ${syncedCsp.replace("form-action 'self'", "form-action 'self' https://example.com")}; frame-ancestors 'self'`,
        '',
      ].join('\n'),
    })
    fixtures.push(dir)

    const result = runDrift(dir)

    expect(result.status).not.toBe(0)
    expect(result.output).toContain('CSP "form-action" drifted')
    expect(result.output).toContain('https://example.com')
  })

  it('fails when a valueless CSP directive drifts between _headers and layout', () => {
    const dir = makeFixture({
      layout: [
        'export default function RootLayout() {',
        '  return (',
        '    <html><head>',
        `      <meta httpEquiv="Content-Security-Policy" content="${syncedCsp.replace('; upgrade-insecure-requests', '')}" />`,
        '    </head><body /></html>',
        '  )',
        '}',
        '',
      ].join('\n'),
    })
    fixtures.push(dir)

    const result = runDrift(dir)

    expect(result.status).not.toBe(0)
    expect(result.output).toContain('CSP "upgrade-insecure-requests" drifted')
    expect(result.output).toContain('only in _headers')
  })
})
