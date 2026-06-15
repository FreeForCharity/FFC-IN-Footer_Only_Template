import robots from '../../src/app/robots'

const originalBasePath = process.env.NEXT_PUBLIC_BASE_PATH

afterEach(() => {
  if (originalBasePath === undefined) {
    delete process.env.NEXT_PUBLIC_BASE_PATH
  } else {
    process.env.NEXT_PUBLIC_BASE_PATH = originalBasePath
  }
})

describe('robots.txt generation', () => {
  it('should return a valid robots config', () => {
    const result = robots()
    expect(result).toBeDefined()
  })

  it('should allow all user agents to crawl /', () => {
    const result = robots()
    expect(result.rules).toBeDefined()

    // rules can be an object or array
    const rules = Array.isArray(result.rules) ? result.rules : [result.rules]
    const wildcardRule = rules.find((r) => r.userAgent === '*')
    expect(wildcardRule).toBeDefined()
    expect(wildcardRule!.allow).toBe('/')
  })

  it('should include sitemap URL', () => {
    const result = robots()
    expect(result.sitemap).toBeDefined()
    expect(result.sitemap).toContain('sitemap.xml')
  })

  it('should use the correct base URL', () => {
    delete process.env.NEXT_PUBLIC_BASE_PATH
    const result = robots()
    expect(result.sitemap).toContain('ffcworkingsite1.org')
  })

  it('should include GitHub Pages base path in sitemap URL when configured', () => {
    process.env.NEXT_PUBLIC_BASE_PATH = '/FFC-IN-Footer_Only_Template'

    const result = robots()

    expect(result.sitemap).toBe(
      'https://ffcworkingsite1.org/FFC-IN-Footer_Only_Template/sitemap.xml'
    )
  })
})
