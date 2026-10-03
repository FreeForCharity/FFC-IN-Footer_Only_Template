import { siteConfig, cardDescription, twitterSite } from '../../src/lib/site.config'
import { siteMetadata } from '../../src/lib/siteMetadata'

// Every assertion here derives from src/lib/site.config.ts, which is the
// documented single customization point for a fork. Hardcoding this charity's
// own name, URL or keywords would make a correct rebrand fail — see the note in
// __tests__/lib/site.config.test.ts.
describe('Site metadata', () => {
  it('should have the correct metadataBase URL', () => {
    expect(siteMetadata.metadataBase?.toString()).toBe(`${siteConfig.url}/`)
  })

  it('should have a title carrying the site name', () => {
    const title = siteMetadata.title as { default: string; template: string }
    expect(title.default).toContain(siteConfig.name)
    expect(title.template).toContain(siteConfig.name)
    // The template must leave a slot for the per-page title.
    expect(title.template).toContain('%s')
  })

  it('should have a description sourced from the site config', () => {
    expect(siteMetadata.description).toBe(siteConfig.description)
    expect(siteMetadata.description!.length).toBeGreaterThan(50)
  })

  it('should have relevant keywords', () => {
    const keywords = siteMetadata.keywords as string[]
    expect(keywords).toEqual([...siteConfig.keywords])
    expect(keywords.length).toBeGreaterThan(0)
  })

  it('should define OpenGraph fields', () => {
    const og = siteMetadata.openGraph as Record<string, unknown>
    expect(og.type).toBe('website')
    expect(og.siteName).toBe(siteConfig.name)
    expect(og.url).toBe(`${siteConfig.url}/`)
    expect(og.description).toBe(cardDescription())
    expect(og.images).toBeDefined()
  })

  it('should define Twitter card fields', () => {
    const twitter = siteMetadata.twitter as Record<string, unknown>
    expect(twitter.card).toBe('summary_large_image')
    // A site with no handle omits twitter:site entirely rather than emitting
    // an empty or dangling '@'.
    expect(twitter.site).toBe(twitterSite())
  })

  it('should allow indexing and following', () => {
    const robots = siteMetadata.robots as Record<string, unknown>
    expect(robots.index).toBe(true)
    expect(robots.follow).toBe(true)
  })

  it('should define icon and manifest paths', () => {
    expect(siteMetadata.manifest).toBeDefined()
    expect(siteMetadata.icons).toBeDefined()
  })
})
