import { execFileSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const syncedCsp =
  "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https://www.googletagmanager.com; frame-src https://www.googletagmanager.com; media-src 'self' blob: https:; object-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests"

function payload(expires = '2027-12-31T00:00:00.000Z'): string {
  return [
    'Contact: mailto:clarkemoyer@freeforcharity.org',
    `Expires: ${expires}`,
    'Preferred-Languages: en',
    'Canonical: https://ffcworkingsite1.org/.well-known/security.txt',
    'Canonical: https://ffcworkingsite1.org/security.txt',
    'Canonical: https://ffcworkingsite1.org/FFC-IN-Footer_Only_Template/.well-known/security.txt',
    'Canonical: https://ffcworkingsite1.org/FFC-IN-Footer_Only_Template/security.txt',
    'Policy: https://ffcworkingsite1.org/vulnerability-disclosure-policy',
    'Policy: https://ffcworkingsite1.org/FFC-IN-Footer_Only_Template/vulnerability-disclosure-policy',
    'Acknowledgments: https://ffcworkingsite1.org/security-acknowledgements',
    'Acknowledgments: https://ffcworkingsite1.org/FFC-IN-Footer_Only_Template/security-acknowledgements',
    '',
  ].join('\n')
}

function makeFixture(
  overrides: Partial<
    Record<'headers' | 'layout' | 'siteConfig' | 'wellKnown' | 'rootSecurity', string | null>
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

  return dir
}

function runDrift(dir: string) {
  try {
    const output = execFileSync('node', ['scripts/check-drift.mjs'], {
      cwd: dir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    return { status: 0, output }
  } catch (error) {
    const err = error as { status?: number; stdout?: string; stderr?: string }
    return {
      status: err.status ?? 1,
      output: `${err.stdout ?? ''}${err.stderr ?? ''}`,
    }
  }
}

describe('security drift guard', () => {
  let fixtures: string[] = []

  afterEach(() => {
    for (const fixture of fixtures) rmSync(fixture, { recursive: true, force: true })
    fixtures = []
  })

  it('fails when public/_headers is missing', () => {
    const dir = makeFixture({ headers: null })
    fixtures.push(dir)

    const result = runDrift(dir)

    expect(result.status).not.toBe(0)
    expect(result.output).toContain('public/_headers is missing')
  })

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
