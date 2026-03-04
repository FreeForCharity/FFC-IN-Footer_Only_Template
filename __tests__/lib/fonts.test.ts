// next/font/google cannot be called outside of Next.js module scope in Jest.
// We verify that the module exports the expected font constants by checking
// the source file structure directly.

import fs from 'fs'
import path from 'path'

const fontsSource = fs.readFileSync(path.join(__dirname, '../../src/lib/fonts.ts'), 'utf8')

describe('lib/fonts', () => {
  it('should export the expected font names', () => {
    const expectedExports = [
      'openSans',
      'lato',
      'raleway',
      'faustina',
      'cantataOne',
      'faunaOne',
      'montserrat',
      'cinzel',
    ]

    for (const name of expectedExports) {
      expect(fontsSource).toContain(`export const ${name}`)
    }
  })

  it('should import from next/font/google', () => {
    expect(fontsSource).toContain("from 'next/font/google'")
  })

  it('should configure all fonts with latin subset and swap display', () => {
    const latinMatches = fontsSource.match(/subsets:\s*\['latin'\]/g)
    const swapMatches = fontsSource.match(/display:\s*'swap'/g)

    // There are 8 font exports
    expect(latinMatches).toHaveLength(8)
    expect(swapMatches).toHaveLength(8)
  })

  it('should set CSS variable for each font', () => {
    const expectedVariables = [
      '--font-open-sans',
      '--font-lato',
      '--font-raleway',
      '--font-faustina',
      '--font-cantata-one',
      '--font-fauna-one',
      '--font-montserrat',
      '--font-cinzel',
    ]

    for (const variable of expectedVariables) {
      expect(fontsSource).toContain(variable)
    }
  })
})
