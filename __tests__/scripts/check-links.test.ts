import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
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
