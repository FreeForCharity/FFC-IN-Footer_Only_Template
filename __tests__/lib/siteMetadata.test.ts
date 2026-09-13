import { siteMetadata } from '../../src/lib/siteMetadata'

describe('siteMetadata module', () => {
  it('should export a metadata object', () => {
    expect(siteMetadata).toBeDefined()
    expect(typeof siteMetadata).toBe('object')
  })

  it('should have metadataBase as a URL', () => {
    expect(siteMetadata.metadataBase).toBeInstanceOf(URL)
  })

  it('should have a title with default and template', () => {
    const title = siteMetadata.title as { default: string; template: string }
    expect(title.default).toBeDefined()
    expect(title.template).toBeDefined()
    expect(title.template).toContain('%s')
  })

  it('should have a non-empty description', () => {
    expect(typeof siteMetadata.description).toBe('string')
    expect(siteMetadata.description!.length).toBeGreaterThan(0)
  })

  it('should have keywords as an array', () => {
    expect(Array.isArray(siteMetadata.keywords)).toBe(true)
    expect((siteMetadata.keywords as string[]).length).toBeGreaterThan(0)
  })

  it('should have robots configuration', () => {
    expect(siteMetadata.robots).toBeDefined()
  })

  it('should have openGraph configuration', () => {
    expect(siteMetadata.openGraph).toBeDefined()
  })

  it('should have twitter configuration', () => {
    expect(siteMetadata.twitter).toBeDefined()
  })

  it('should have icons configuration', () => {
    expect(siteMetadata.icons).toBeDefined()
  })

  it('should have a manifest path', () => {
    expect(siteMetadata.manifest).toBeDefined()
    expect(typeof siteMetadata.manifest).toBe('string')
  })
})

describe('social card', () => {
  // The card used to be the 512x512 app icon under a `summary_large_image`
  // twitter:card, a combination no platform renders as intended. These
  // assertions are what keep it from drifting back.
  const image = (
    siteMetadata.openGraph?.images as { url: string; width: number; height: number }[]
  )[0]

  it('is 1200x630', () => {
    expect(image.width).toBe(1200)
    expect(image.height).toBe(630)
  })

  it('is the generated card, not the square app icon', () => {
    expect(image.url).toMatch(/\/og-card\.png$/)
    expect(image.url).not.toContain('web-app-manifest')
  })

  it('is the same image on the twitter card', () => {
    expect((siteMetadata.twitter?.images as string[])[0]).toBe(image.url)
  })
})
