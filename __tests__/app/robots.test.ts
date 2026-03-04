import robots from '../../src/app/robots'

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
    const result = robots()
    expect(result.sitemap).toContain('ffcworkingsite1.org')
  })
})
