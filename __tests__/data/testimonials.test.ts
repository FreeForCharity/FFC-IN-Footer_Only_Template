import { testimonials } from '../../src/data/testimonials'

describe('Testimonials data integrity', () => {
  it('should have at least 3 unique testimonials', () => {
    const uniqueQuotes = new Set(testimonials.map((t) => t.quote))
    expect(uniqueQuotes.size).toBeGreaterThanOrEqual(3)
  })

  it.each(testimonials.map((t, i) => ({ ...t, index: i })))(
    'testimonial #$index should have required fields',
    (testimonial) => {
      expect(testimonial.author).toBeDefined()
      expect(typeof testimonial.author).toBe('string')
      expect(testimonial.author.trim().length).toBeGreaterThan(0)

      expect(testimonial.quote).toBeDefined()
      expect(typeof testimonial.quote).toBe('string')
      expect(testimonial.quote.trim().length).toBeGreaterThan(0)
    }
  )

  it('should have quotes longer than a trivial sentence', () => {
    const uniqueQuotes = [...new Set(testimonials.map((t) => t.quote))]
    for (const quote of uniqueQuotes) {
      expect(quote.length).toBeGreaterThan(30)
    }
  })
})
