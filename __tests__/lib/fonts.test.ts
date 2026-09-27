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

// `weights` are the weights the Google definition loaded; `sources` are the
// `weight` values fonts.ts declares. A range ('300 800') is one variable woff2
// covering every weight in it, which is how the Google loader served these
// families: one file per weight would preload 25 files instead of 9.
const expectedFonts: Array<{
  name: string
  variable: string
  weights: string[]
  sources: string[]
}> = [
  {
    name: 'openSans',
    variable: '--font-open-sans',
    weights: ['400', '500', '600', '700', '800'],
    sources: ['300 800'],
  },
  { name: 'lato', variable: '--font-lato', weights: ['400', '700'], sources: ['400', '700'] },
  {
    name: 'raleway',
    variable: '--font-raleway',
    weights: ['400', '500', '600', '700'],
    sources: ['100 900'],
  },
  {
    name: 'faustina',
    variable: '--font-faustina',
    weights: ['400', '500', '600', '700'],
    sources: ['300 800'],
  },
  { name: 'cantataOne', variable: '--font-cantata-one', weights: ['400'], sources: ['400'] },
  { name: 'faunaOne', variable: '--font-fauna-one', weights: ['400'], sources: ['400'] },
  {
    name: 'montserrat',
    variable: '--font-montserrat',
    weights: ['400', '500', '600', '700'],
    sources: ['100 900'],
  },
  {
    name: 'cinzel',
    variable: '--font-cinzel',
    weights: ['400', '500', '600', '700'],
    sources: ['400 900'],
  },
]

/** True when a declared `weight` ('400' or '300 800') covers weight `w`. */
function covers(weight: string, w: string): boolean {
  const [lo, hi = lo] = weight.split(' ').map(Number)
  return Number(w) >= lo && Number(w) <= hi
}

/** The body of `export const <name> = localFont({ ... })`, or null. */
function fontBlock(name: string): string | null {
  const match = fontsSource.match(
    new RegExp(
      `export\\s+const\\s+${name}\\s*=\\s*localFont\\(\\s*\\{([\\s\\S]*?)\\n\\s*\\}\\s*\\)`
    )
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
  // Same policy as check:drift's checkSelfHostedFonts: a mention inside a
  // comment is allowed, so the reason can be written next to the code.
  // Same scan as check:drift's commentSpans: one pass that tracks strings and
  // url(...), so a `//` or `/*` inside a string is not a comment. '...' and
  // "..." strings end at a line break, as in JS.
  const commentSpans = (body: string) => {
    const spans: Array<[number, number]> = []
    let i = 0
    while (i < body.length) {
      const ch = body[i]
      if (ch === '"' || ch === "'" || ch === '`') {
        i++
        while (i < body.length && body[i] !== ch && (ch === '`' || body[i] !== '\n')) {
          i += body[i] === '\\' ? 2 : 1
        }
        i++
      } else if (/^url\(/i.test(body.slice(i, i + 4))) {
        const end = body.indexOf(')', i)
        i = end === -1 ? body.length : end + 1
      } else if (ch === '/' && (body[i + 1] === '*' || body[i + 1] === '/')) {
        const end = body[i + 1] === '*' ? body.indexOf('*/', i + 2) : body.indexOf('\n', i)
        const stop = end === -1 ? body.length : body[i + 1] === '*' ? end + 2 : end
        spans.push([i, stop])
        i = stop
      } else i++
    }
    return spans
  }
  const inComment = (code: string, at: number) =>
    commentSpans(code).some(([start, stop]) => at >= start && at < stop)
  const usesGoogleLoader = (code: string) =>
    [...code.matchAll(/next\/font\/google/g)].some((m) => !inComment(code, m.index ?? 0))

  it('never uses next/font/google anywhere under src/', () => {
    const offenders = walk(SRC_DIR)
      .filter((file) => /\.(tsx?|jsx?|mjs|cjs|css|scss)$/.test(file))
      .filter((file) => usesGoogleLoader(fs.readFileSync(file, 'utf8')))
      .map((file) => path.relative(SRC_DIR, file))

    expect(offenders).toEqual([])
  })

  it('ignores next/font/google named only in a comment', () => {
    expect(usesGoogleLoader("import { Lato } from 'next/font/google'")).toBe(true)
    expect(usesGoogleLoader("const u = 'https://x.example'; import('next/font/google')")).toBe(true)
    expect(usesGoogleLoader("// was: import { Lato } from 'next/font/google'")).toBe(false)
    expect(usesGoogleLoader("const u = '//cdn.example'; import('next/font/google')")).toBe(true)
    expect(usesGoogleLoader("const x = 1// import('next/font/google')")).toBe(false)
    expect(usesGoogleLoader("const s = '/*'; import('next/font/google')")).toBe(true)
    expect(usesGoogleLoader('/*\n * next/font/google fetched at build time\n */')).toBe(false)
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
    ({ name, variable, weights, sources }) => {
      const block = fontBlock(name)!
      expect(block).toContain(`variable: '${variable}'`)
      expect(block).toMatch(/display:\s*'swap'/)

      const declared = [...block.matchAll(/weight:\s*'([\d ]+)'/g)].map((m) => m[1])
      expect(declared).toEqual(sources)
      const missing = weights.filter((w) => !declared.some((d) => covers(d, w)))
      expect(missing).toEqual([])
    }
  )

  it('points every src path at a real woff2 file on disk', () => {
    const paths = [...fontsSource.matchAll(/path:\s*'([^']+)'/g)].map((m) => m[1])
    const expectedCount = expectedFonts.reduce((n, f) => n + f.sources.length, 0)
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
