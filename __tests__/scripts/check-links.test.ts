import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { get } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

function getText(url: string): Promise<{ body: string; status: number }> {
  return new Promise((resolve, reject) => {
    const request = get(url, (response) => {
      let body = ''
      response.setEncoding('utf8')
      response.on('data', (chunk) => {
        body += chunk
      })
      response.on('end', () => {
        resolve({ body, status: response.statusCode ?? 0 })
      })
    })

    request.on('error', reject)
  })
}

describe('link check static server', () => {
  let fixtures: string[] = []
  let servers: Array<{ close: () => Promise<void> }> = []

  afterEach(async () => {
    await Promise.all(servers.map((server) => server.close()))
    servers = []

    for (const fixture of fixtures) rmSync(fixture, { recursive: true, force: true })
    fixtures = []
  })

  it('serves GitHub Pages-style clean URLs from static export output', async () => {
    const { createStaticExportServer } = await import('../../scripts/check-links.mjs')
    const dir = mkdtempSync(join(tmpdir(), 'ffc-check-links-'))
    const outDir = join(dir, 'out')
    fixtures.push(dir)

    mkdirSync(join(outDir, 'cookie-policy'), { recursive: true })
    mkdirSync(join(outDir, '.well-known'), { recursive: true })
    writeFileSync(join(outDir, 'index.html'), '<a href="/privacy-policy">Privacy</a>')
    writeFileSync(join(outDir, 'privacy-policy.html'), '<h1>Privacy</h1>')
    writeFileSync(join(outDir, 'cookie-policy/index.html'), '<h1>Cookies</h1>')
    writeFileSync(join(outDir, '.well-known/security.txt'), 'Contact: mailto:test@example.org\n')
    writeFileSync(join(outDir, '404.html'), '<h1>Not found</h1>')

    const server = await createStaticExportServer(outDir)
    servers.push(server)

    await expect(getText(`${server.url}/`).then((response) => response.body)).resolves.toContain(
      'Privacy'
    )
    await expect(
      getText(`${server.url}/privacy-policy`).then((response) => response.body)
    ).resolves.toContain('Privacy')
    await expect(
      getText(`${server.url}/cookie-policy/`).then((response) => response.body)
    ).resolves.toContain('Cookies')
    await expect(
      getText(`${server.url}/.well-known/security.txt`).then((response) => response.body)
    ).resolves.toContain('Contact:')

    const missing = await getText(`${server.url}/missing`)
    expect(missing.status).toBe(404)
    expect(missing.body).toContain('Not found')
  })
})

describe('own-origin skip derivation', () => {
  let fixtures: string[] = []

  afterEach(() => {
    for (const fixture of fixtures) rmSync(fixture, { recursive: true, force: true })
    fixtures = []
  })

  const configSource = (url: string, supportedByUrl = 'https://freeforcharity.org') =>
    [
      'export const siteConfig = {',
      "  name: 'Example Charity',",
      `  url: '${url}',`,
      '  supportedBy: {',
      `    url: '${supportedByUrl}',`,
      '  },',
      '}',
      '',
    ].join('\n')

  it('derives the skip pattern from the top-level url', async () => {
    const { ownOriginSkipPattern } = await import('../../scripts/check-links.mjs')

    expect(ownOriginSkipPattern(configSource('https://charity.example'))).toBe(
      '^https://charity\\.example(/.*)?$'
    )
  })

  // The supporting organization's site is a genuinely external link and must
  // stay checked. A looser `url:` match would pick it up and silently stop
  // verifying it.
  it('does not pick up the nested supportedBy url', async () => {
    const { ownOriginSkipPattern } = await import('../../scripts/check-links.mjs')

    const pattern = ownOriginSkipPattern(configSource('https://charity.example'))
    expect(pattern).not.toBeNull()
    expect(new RegExp(pattern as string).test('https://freeforcharity.org/about')).toBe(false)
    expect(new RegExp(pattern as string).test('https://charity.example/privacy-policy/')).toBe(true)
  })

  it('returns null rather than a wrong pattern when the url is unparseable', async () => {
    const { ownOriginSkipPattern } = await import('../../scripts/check-links.mjs')

    expect(ownOriginSkipPattern(configSource('not-a-url'))).toBeNull()
    expect(ownOriginSkipPattern('export const siteConfig = {}\n')).toBeNull()
  })

  it('merges the derived pattern into the committed linkinator config', async () => {
    const { resolveLinkinatorConfig } = await import('../../scripts/check-links.mjs')
    const dir = mkdtempSync(join(tmpdir(), 'ffc-linkcfg-'))
    fixtures.push(dir)

    const configPath = join(dir, '.linkinatorrc.json')
    const siteConfigPath = join(dir, 'site.config.ts')
    writeFileSync(configPath, JSON.stringify({ skip: ['^mailto:.*'], timeout: 10000 }))
    writeFileSync(siteConfigPath, configSource('https://charity.example'))

    const resolved = resolveLinkinatorConfig(configPath, siteConfigPath)
    expect(resolved).not.toBe(configPath)

    const merged = JSON.parse(readFileSync(resolved, 'utf8'))
    // The committed entries survive; only the derived one is added.
    expect(merged.skip).toEqual(['^mailto:.*', '^https://charity\\.example(/.*)?$'])
    expect(merged.timeout).toBe(10000)
  })

  it('falls back to the committed config when site.config.ts cannot be read', async () => {
    const { resolveLinkinatorConfig } = await import('../../scripts/check-links.mjs')
    const dir = mkdtempSync(join(tmpdir(), 'ffc-linkcfg-'))
    fixtures.push(dir)

    const configPath = join(dir, '.linkinatorrc.json')
    writeFileSync(configPath, JSON.stringify({ skip: [] }))

    expect(resolveLinkinatorConfig(configPath, join(dir, 'missing.ts'))).toBe(configPath)
  })
})
