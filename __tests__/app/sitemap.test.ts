import sitemap from '../../src/app/sitemap'

const originalBasePath = process.env.NEXT_PUBLIC_BASE_PATH

afterEach(() => {
  if (originalBasePath === undefined) {
    delete process.env.NEXT_PUBLIC_BASE_PATH
  } else {
    process.env.NEXT_PUBLIC_BASE_PATH = originalBasePath
  }
})

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
    delete process.env.NEXT_PUBLIC_BASE_PATH
    const result = sitemap()
    for (const entry of result) {
      expect(entry.url).toContain('ffcworkingsite1.org')
    }
  })

  it('should include GitHub Pages base path in route URLs when configured', () => {
    process.env.NEXT_PUBLIC_BASE_PATH = '/FFC-IN-Footer_Only_Template'

    const result = sitemap()

    expect(
      result.find((entry) => entry.url.endsWith('/FFC-IN-Footer_Only_Template/'))
    ).toBeDefined()
    expect(
      result.find((entry) => entry.url.includes('/FFC-IN-Footer_Only_Template/privacy-policy'))
    ).toBeDefined()
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
