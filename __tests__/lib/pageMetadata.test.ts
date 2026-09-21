import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pageMetadata } from '../../src/lib/pageMetadata'
import { siteMetadata } from '../../src/lib/siteMetadata'
import { siteConfig, siteUrl } from '../../src/lib/site.config'

const APP_DIR = join(__dirname, '..', '..', 'src', 'app')

describe('pageMetadata', () => {
  const meta = pageMetadata({
    title: 'Privacy Policy',
    description: 'How we handle your data.',
    path: '/privacy-policy',
  })

  // The defect this helper closes: every page emitted the HOME page's og:url,
  // so a share of any inner page unfurled as the front page.
  it('points og:url at the page, not the site root', () => {
    expect(meta.openGraph?.url).toBe(siteUrl('/privacy-policy'))
    expect(meta.openGraph?.url).not.toBe(siteUrl('/'))
    expect(meta.alternates?.canonical).toBe(siteUrl('/privacy-policy'))
  })

  it('gives the social card the page title and description', () => {
    expect(meta.openGraph?.title).toBe(`Privacy Policy | ${siteConfig.name}`)
    expect(meta.openGraph?.description).toBe('How we handle your data.')
    expect(meta.twitter?.title).toBe(`Privacy Policy | ${siteConfig.name}`)
    expect(meta.twitter?.description).toBe('How we handle your data.')
  })

  // The <title> tag gets its suffix from the layout's title template, so the
  // raw title must stay raw here or the suffix lands twice.
  it('leaves the document title unsuffixed for the title template', () => {
    expect(meta.title).toBe('Privacy Policy')
  })

  // Next replaces `openGraph` wholesale rather than merging it, so anything
  // the layout sets and this helper forgets is simply absent from the page.
  it('carries the shared social fields through from siteMetadata', () => {
    expect(meta.openGraph?.siteName).toBe(siteMetadata.openGraph?.siteName)
    // Cast: `type` is only on some members of Next's OpenGraph union.
    expect((meta.openGraph as { type?: string }).type).toBe('website')
    expect(meta.openGraph?.images).toBe(siteMetadata.openGraph?.images)
    expect(meta.openGraph?.images).toBeDefined()
    expect((meta.twitter as { card?: string }).card).toBe('summary_large_image')
    expect(meta.twitter?.images).toBe(siteMetadata.twitter?.images)
  })
})

describe('every content route uses it', () => {
  const routes = readdirSync(APP_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => {
      try {
        readFileSync(join(APP_DIR, name, 'page.tsx'), 'utf8')
        return true
      } catch {
        return false
      }
    })

  it('finds the content routes to check', () => {
    expect(routes.length).toBeGreaterThan(3)
  })

  // A new page that hand-rolls `alternates` is the regression: it looks
  // complete, passes review, and silently ships the home page's og:url again.
  it.each(routes)('src/app/%s/page.tsx builds metadata with pageMetadata()', (route) => {
    const source = readFileSync(join(APP_DIR, route, 'page.tsx'), 'utf8')

    expect(source).toContain('pageMetadata({')
    expect(source).not.toMatch(/alternates:\s*\{\s*canonical/)
  })
})
