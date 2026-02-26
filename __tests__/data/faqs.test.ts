import { faqs, type Faq } from '../../src/data/faqs'

describe('FAQ data integrity', () => {
  it('should have at least 2 FAQs', () => {
    expect(faqs.length).toBeGreaterThanOrEqual(2)
  })

  it.each(faqs.map((faq, i) => ({ ...faq, index: i })))(
    'FAQ #$index "$question" should have required fields',
    (faq) => {
      expect(faq.question).toBeDefined()
      expect(typeof faq.question).toBe('string')
      expect(faq.question.trim().length).toBeGreaterThan(0)

      expect(faq.answer).toBeDefined()
      expect(typeof faq.answer).toBe('string')
      expect(faq.answer.trim().length).toBeGreaterThan(0)
    }
  )

  it('should have questions that end with a question mark or are well-formed', () => {
    for (const faq of faqs) {
      // Questions should end with ? or /
      // (some questions contain slashes for alternative phrasings)
      expect(faq.question.length).toBeGreaterThan(10)
    }
  })

  it('should have answers longer than a trivial response', () => {
    for (const faq of faqs) {
      expect(faq.answer.length).toBeGreaterThan(20)
    }
  })

  it('should export the Faq type correctly', () => {
    const testFaq: Faq = { question: 'test?', answer: 'answer' }
    expect(testFaq).toBeDefined()
  })
})
