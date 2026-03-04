import sitemap from '../../src/app/sitemap'

describe('sitemap.xml generation', () => {
  it('should return a non-empty array', () => {
    const result = sitemap()
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })

  it('should include the home page', () => {
    const result = sitemap()
    const homeEntry = result.find((entry) => entry.url.endsWith('/'))
    expect(homeEntry).toBeDefined()
  })

  it('should use the correct base URL', () => {
    const result = sitemap()
    for (const entry of result) {
      expect(entry.url).toContain('ffcworkingsite1.org')
    }
  })

  it('should have lastModified dates', () => {
    const result = sitemap()
    for (const entry of result) {
      expect(entry.lastModified).toBeDefined()
      expect(entry.lastModified).toBeInstanceOf(Date)
    }
  })

  it('should set home page priority to 1', () => {
    const result = sitemap()
    const homeEntry = result.find((entry) => entry.url.endsWith('/'))
    expect(homeEntry!.priority).toBe(1)
  })
})
