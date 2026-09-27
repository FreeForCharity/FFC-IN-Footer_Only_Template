// next/font loaders cannot be called outside of Next.js module scope in Jest,
// so these tests read src/lib/fonts.ts as text and check the files it names.
//
// Fonts are self-hosted: `next/font/google` downloads from Google during
// `next build`, which intermittently failed the build (#163). Every family is
// loaded with next/font/local from woff2 files committed under src/fonts/.

import fs from 'fs'
import path from 'path'

const SRC_DIR = path.join(__dirname, '../../src')
const FONTS_TS = path.join(SRC_DIR, 'lib/fonts.ts')
const fontsSource = fs.readFileSync(FONTS_TS, 'utf8')

const expectedFonts: Array<{ name: string; variable: string; weights: string[] }> = [
  { name: 'openSans', variable: '--font-open-sans', weights: ['400', '500', '600', '700', '800'] },
  { name: 'lato', variable: '--font-lato', weights: ['400', '700'] },
  { name: 'raleway', variable: '--font-raleway', weights: ['400', '500', '600', '700'] },
  { name: 'faustina', variable: '--font-faustina', weights: ['400', '500', '600', '700'] },
  { name: 'cantataOne', variable: '--font-cantata-one', weights: ['400'] },
  { name: 'faunaOne', variable: '--font-fauna-one', weights: ['400'] },
  { name: 'montserrat', variable: '--font-montserrat', weights: ['400', '500', '600', '700'] },
  { name: 'cinzel', variable: '--font-cinzel', weights: ['400', '500', '600', '700'] },
]

/** The body of `export const <name> = localFont({ ... })`, or null. */
function fontBlock(name: string): string | null {
  const match = fontsSource.match(
    new RegExp(`export const ${name} = localFont\\(\\{([\\s\\S]*?)\\n\\}\\)`)
  )
  return match ? match[1] : null
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else out.push(full)
  }
  return out
}

describe('lib/fonts', () => {
  it('never uses next/font/google anywhere under src/', () => {
    const offenders = walk(SRC_DIR)
      .filter((file) => /\.(tsx?|jsx?|mjs|cjs|css|scss)$/.test(file))
      .filter((file) => fs.readFileSync(file, 'utf8').includes('next/font/google'))
      .map((file) => path.relative(SRC_DIR, file))

    expect(offenders).toEqual([])
  })

  it('imports only next/font/local', () => {
    const imports = [...fontsSource.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1])
    expect(imports).toEqual(['next/font/local'])
  })

  it('declares exactly the expected exports, each with next/font/local', () => {
    const exported = [...fontsSource.matchAll(/export const (\w+)\s*=/g)].map((m) => m[1])
    expect(exported.sort()).toEqual(expectedFonts.map((f) => f.name).sort())

    for (const { name } of expectedFonts) {
      expect(fontBlock(name)).not.toBeNull()
    }
  })

  it.each(expectedFonts)(
    '$name keeps its CSS variable, swap display and weights',
    ({ name, variable, weights }) => {
      const block = fontBlock(name)!
      expect(block).toContain(`variable: '${variable}'`)
      expect(block).toMatch(/display:\s*'swap'/)

      const declared = [...block.matchAll(/weight:\s*'(\d+)'/g)].map((m) => m[1])
      expect(declared).toEqual(weights)
    }
  )

  it('points every src path at a real woff2 file on disk', () => {
    const paths = [...fontsSource.matchAll(/path:\s*'([^']+)'/g)].map((m) => m[1])
    const expectedCount = expectedFonts.reduce((n, f) => n + f.weights.length, 0)
    expect(paths).toHaveLength(expectedCount)

    for (const rel of paths) {
      expect(rel).toMatch(/\.woff2$/)
      const abs = path.resolve(path.dirname(FONTS_TS), rel)
      expect(fs.existsSync(abs)).toBe(true)
      // woff2 files start with the signature "wOF2"; this catches a Git LFS
      // pointer or an HTML error page saved under a .woff2 name.
      expect(fs.readFileSync(abs).subarray(0, 4).toString('latin1')).toBe('wOF2')
    }
  })

  it('ships the font license next to every family', () => {
    const families = new Set(
      [...fontsSource.matchAll(/path:\s*'\.\.\/fonts\/([^/']+)\//g)].map((m) => m[1])
    )
    expect(families.size).toBe(expectedFonts.length)
    for (const family of families) {
      const license = path.join(SRC_DIR, 'fonts', family, 'LICENSE')
      expect(fs.existsSync(license)).toBe(true)
      expect(fs.readFileSync(license, 'utf8')).toContain('SIL Open Font License')
    }
  })
})
