import { siteMetadata } from '../../src/lib/siteMetadata'

describe('Site metadata', () => {
  it('should have the correct metadataBase URL', () => {
    expect(siteMetadata.metadataBase?.toString()).toBe('https://ffcworkingsite1.org/')
  })

  it('should have a title containing Free For Charity', () => {
    const title = siteMetadata.title as { default: string; template: string }
    expect(title.default).toContain('Free For Charity')
    expect(title.template).toContain('Free For Charity')
  })

  it('should have a description mentioning nonprofits', () => {
    expect(siteMetadata.description).toContain('nonprofits')
    expect(siteMetadata.description!.length).toBeGreaterThan(50)
  })

  it('should have relevant keywords', () => {
    const keywords = siteMetadata.keywords as string[]
    expect(keywords).toContain('nonprofit')
    expect(keywords).toContain('charity')
    expect(keywords).toContain('volunteer')
  })

  it('should define OpenGraph fields', () => {
    const og = siteMetadata.openGraph as Record<string, unknown>
    expect(og.type).toBe('website')
    expect(og.siteName).toBe('Free For Charity')
    expect(og.url).toBe('https://ffcworkingsite1.org/')
    expect(og.images).toBeDefined()
  })

  it('should define Twitter card fields', () => {
    const twitter = siteMetadata.twitter as Record<string, unknown>
    expect(twitter.card).toBe('summary_large_image')
    expect(twitter.site).toContain('freeforcharity')
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
