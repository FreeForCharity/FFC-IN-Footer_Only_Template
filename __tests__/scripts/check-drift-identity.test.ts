import { spawnSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

/**
 * The FFC-identity drift scan (FFC-Cloudflare-Automation#1392).
 *
 * The scan is DORMANT while siteConfig.name is still the template's own, which
 * is what keeps it from failing template PRs — and also means every case here
 * that expects a finding has to rebrand the fixture first. A case that forgets
 * to would pass for the wrong reason, so `dormantOnTheTemplateItself` below is
 * the control that proves the dormancy is real rather than the scan being
 * broken.
 *
 * Cases that assert on the header assert against the SHIPPED component text,
 * mutated in place with its anchor checked first, rather than against a
 * hand-written copy: a fixture that merely resembles the component would keep
 * passing after the component changed.
 */

const REBRANDED = 'Sample Charity Trust'

/** siteConfig source with a chosen name, plus any extra properties. */
function configSource(name: string, extra: string[] = []): string {
  return [
    'export const siteConfig = {',
    `  name: '${name}',`,
    "  url: 'https://ffcworkingsite1.org',",
    ...extra.map((line) => `  ${line}`),
    '}',
    '',
  ].join('\n')
}

/** The permanent "Supported by" attribution, which keeps FFC's name forever. */
const SUPPORTED_BY =
  "supportedBy: { name: 'Free For Charity', url: 'https://freeforcharity.org', hubUrl: 'https://freeforcharity.org/hub/' },"

/**
 * A minimal repo the drift script can run in. Only src/lib/site.config.ts is
 * required; `files` adds repo-relative sources for the scan to walk. Other
 * drift checks will report their own errors against so small a tree — every
 * assertion here is scoped to the identity messages, so that noise is inert.
 */
function fixture(configBody: string, files: Record<string, string> = {}): string {
  const dir = mkdtempSync(join(tmpdir(), 'ffc-identity-'))
  mkdirSync(join(dir, 'scripts'), { recursive: true })
  mkdirSync(join(dir, 'src/lib'), { recursive: true })
  cpSync(join(process.cwd(), 'scripts/check-drift.mjs'), join(dir, 'scripts/check-drift.mjs'))
  writeFileSync(join(dir, 'src/lib/site.config.ts'), configBody)

  for (const [rel, body] of Object.entries(files)) {
    const full = join(dir, rel)
    mkdirSync(join(full, '..'), { recursive: true })
    writeFileSync(full, body)
  }
  return dir
}

/** Identity findings only, one string per reported line. */
function identityFindings(dir: string): string[] {
  const result = spawnSync('node', ['scripts/check-drift.mjs'], { cwd: dir, encoding: 'utf8' })
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.includes('still references'))
}

/** The shipped header component, so cases test the real thing. */
function shippedHeader(): string {
  return readFileSync(join(process.cwd(), 'src/components/header/index.tsx'), 'utf8')
}

/**
 * Substitutes `from` -> `to` once, asserting the anchor is present first. A
 * refactor that moved the anchor would otherwise leave the mutation a no-op and
 * the case green while testing nothing.
 */
function mutate(source: string, from: string, to: string): string {
  expect(source).toContain(from)
  const mutated = source.replace(from, to)
  expect(mutated).not.toEqual(source)
  return mutated
}

describe('check-drift FFC identity scan', () => {
  const made: string[] = []
  const make = (...args: Parameters<typeof fixture>) => {
    const dir = fixture(...args)
    made.push(dir)
    return dir
  }

  afterAll(() => {
    for (const dir of made) rmSync(dir, { recursive: true, force: true })
  })

  it('is dormant on the template itself, even with FFC identity in a component', () => {
    // The control for every case below. If this reported findings, the scan
    // would fail the template's own PRs; if the cases below passed while this
    // one did too, the scan would not be keyed on the rebrand at all.
    const dir = make(configSource('Free For Charity'), {
      'src/components/header/index.tsx': shippedHeader(),
      'src/components/thing.tsx': 'export const x = "Free For Charity"\n',
    })
    expect(identityFindings(dir)).toEqual([])
  })

  it('does not flag the shipped header after a rebrand', () => {
    // The fix itself: the header names the site, not FFC, so it survives a
    // rebrand untouched.
    const dir = make(configSource(REBRANDED), {
      'src/components/header/index.tsx': shippedHeader(),
    })
    expect(identityFindings(dir)).toEqual([])
  })

  it('flags the shipped header if the hard-coded alt text is re-introduced', () => {
    // AC4 of #1392: the scan is only worth having if it discriminates. Derived
    // from the shipped text rather than written by hand.
    const dir = make(configSource(REBRANDED), {
      'src/components/header/index.tsx': mutate(
        shippedHeader(),
        'alt={siteConfig.name}',
        'alt="Free For Charity"'
      ),
    })
    const findings = identityFindings(dir)
    expect(findings).toHaveLength(1)
    expect(findings[0]).toContain('src/components/header/index.tsx')
    expect(findings[0]).toContain('the template org name "Free For Charity"')
    expect(findings[0]).toContain(REBRANDED)
  })

  it('flags the shipped header if the FFC logo URL is re-introduced', () => {
    // The second half of the same defect: the logo used to be hotlinked from
    // FFC's WordPress, which the URL pattern catches independently of the alt.
    const dir = make(configSource(REBRANDED), {
      'src/components/header/index.tsx': mutate(
        shippedHeader(),
        "assetPath('/Images/logo.webp')",
        "'https://freeforcharity.org/wp-content/uploads/2024/04/Screenshot_145.png'"
      ),
    })
    const findings = identityFindings(dir)
    expect(findings).toHaveLength(1)
    expect(findings[0]).toContain('a freeforcharity.org URL')
  })

  it.each([
    ['the org name', 'export const a = "Free For Charity"\n', 'the template org name'],
    ['a lowercased org name', 'export const a = "Free for Charity"\n', 'the template org name'],
    ['a URL', 'export const a = "https://freeforcharity.org/x"\n', 'a freeforcharity.org URL'],
    ['an EIN', 'export const a = "46-2471893"\n', "Free For Charity's EIN"],
    ['an unhyphenated EIN', 'export const a = "462471893"\n', "Free For Charity's EIN"],
    ['a phone number', 'export const a = "520-222-8104"\n', "Free For Charity's phone number"],
    ['an email', 'export const a = "clarkemoyer@freeforcharity.org"\n', 'a @freeforcharity.org'],
  ])('flags %s left in a component after a rebrand', (_label, body, expected) => {
    const dir = make(configSource(REBRANDED), { 'src/components/leftover.tsx': body })
    const findings = identityFindings(dir)
    expect(findings.length).toBeGreaterThanOrEqual(1)
    expect(findings.join('\n')).toContain(expected)
  })

  it('allows the footer platform credit and the FFC donation-policy label', () => {
    const dir = make(configSource(REBRANDED), {
      'src/components/footer/index.tsx': [
        'export const a = (',
        '  <>',
        '    <span>Built with Free For Charity</span>',
        '    <a href="https://freeforcharity.org">Supported by</a>',
        '    <a href="/free-for-charity-donation-policy">Free For Charity Donation Policy</a>',
        '  </>',
        ')',
        '',
      ].join('\n'),
    })
    expect(identityFindings(dir)).toEqual([])
  })

  it('still flags a non-credit FFC reference inside the footer', () => {
    // The allowance is per LINE, not per file: the footer is not a free pass.
    const dir = make(configSource(REBRANDED), {
      'src/components/footer/index.tsx':
        'export const a = <a href="https://freeforcharity.org/hub/">Hub</a>\n',
    })
    const findings = identityFindings(dir)
    expect(findings).toHaveLength(1)
    expect(findings[0]).toContain('src/components/footer/index.tsx')
  })

  it("exempts FFC's own donation-policy page but not the charity's", () => {
    const ffcPolicy = 'export default function P() { return <p>Free For Charity</p> }\n'
    const exempt = make(configSource(REBRANDED), {
      'src/app/free-for-charity-donation-policy/page.tsx': ffcPolicy,
    })
    expect(identityFindings(exempt)).toEqual([])

    // Same body, the charity's own route: exempted by exact path only.
    const ownRoute = make(configSource(REBRANDED), {
      'src/app/donation-policy/page.tsx': ffcPolicy,
    })
    expect(identityFindings(ownRoute)).toHaveLength(1)
  })

  it('allows the supportedBy attribution but nothing else in site.config.ts', () => {
    const allowed = make(configSource(REBRANDED, [SUPPORTED_BY]))
    expect(identityFindings(allowed)).toEqual([])

    // Blanking supportedBy must not blank the rest of the file.
    const alsoLeftover = make(
      configSource(REBRANDED, [SUPPORTED_BY, "contactEmail: 'someone@freeforcharity.org',"])
    )
    const findings = identityFindings(alsoLeftover)
    expect(findings.length).toBeGreaterThanOrEqual(1)
    expect(findings.join('\n')).toContain('src/lib/site.config.ts')
    expect(findings.join('\n')).toContain('a @freeforcharity.org email address')
  })

  it('reads a rebranded name that contains an apostrophe', () => {
    // A name read only as far as its apostrophe would compare unequal to the
    // template's name either way, so this case is about the finding's TEXT
    // naming the site correctly — a truncated name in the error message is how
    // you learn the parser is wrong.
    const dir = make(configSource('').replace("name: '',", `name: "St. Mary's Shelter",`), {
      'src/components/leftover.tsx': 'export const a = "Free For Charity"\n',
    })
    const findings = identityFindings(dir)
    expect(findings).toHaveLength(1)
    expect(findings[0]).toContain("St. Mary's Shelter")
  })
})
