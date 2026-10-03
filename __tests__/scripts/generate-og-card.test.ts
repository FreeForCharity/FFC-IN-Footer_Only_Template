import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const script = join(process.cwd(), 'scripts', 'generate-og-card.mjs')

/**
 * The generator is an ESM script, so these run it through node the way the
 * rest of the scripts suite does rather than importing it into jest's
 * transform pipeline.
 */
function evaluate(expression: string): unknown {
  const result = spawnSync(
    'node',
    [
      '--input-type=module',
      '-e',
      // A file URL: on Windows import() rejects a bare `C:\...` path.
      `const m = await import(${JSON.stringify(pathToFileURL(script).href)});\nprocess.stdout.write(JSON.stringify(${expression}))`,
    ],
    { cwd: process.cwd(), encoding: 'utf8' }
  )

  if (result.status !== 0) {
    throw new Error(`node exited ${result.status}: ${result.stderr}`)
  }
  return JSON.parse(result.stdout)
}

describe('social card palette', () => {
  // themeColor is the BROWSER-UI colour, and this template ships '#ffffff'.
  // A card that always drew white text would render an empty white image --
  // and nothing downstream would report it, because a 1200x630 PNG is exactly
  // what every other check looks for. That is why the palette is derived.
  it('uses dark text on a light themeColor', () => {
    const palette = evaluate("m.cardPalette('#ffffff')") as Record<string, string>

    expect(palette.title).toBe('#0b1020')
    expect(palette.title).not.toBe('#ffffff')
  })

  it('uses light text on a dark themeColor', () => {
    const palette = evaluate("m.cardPalette('#0b1020')") as Record<string, string>

    expect(palette.title).toBe('#ffffff')
  })

  // A malformed value must not throw mid-build, and must not quietly compute
  // a luminance from garbage -- the dark palette is the safe default because
  // an unparseable colour most often ends up rendering as a dark or
  // transparent background.
  it('falls back to the dark palette for an unparseable colour', () => {
    expect(evaluate("m.relativeLuminance('not-a-colour')")).toBeNull()
    expect((evaluate("m.cardPalette('not-a-colour')") as Record<string, string>).title).toBe(
      '#ffffff'
    )
  })

  it('computes WCAG relative luminance', () => {
    expect(evaluate("m.relativeLuminance('#ffffff')")).toBeCloseTo(1, 5)
    expect(evaluate("m.relativeLuminance('#000000')")).toBeCloseTo(0, 5)
    // Accepts the form site.config.ts actually stores, with and without '#'.
    expect(evaluate("m.relativeLuminance('ffffff')")).toBeCloseTo(1, 5)
  })

  // A pending EIN is empty: the footnote drops the EIN rather than baking a
  // dangling "EIN " into the committed PNG.
  it('leaves an empty EIN out of the footnote', () => {
    const config = (ein: string) => JSON.stringify({ ein, supportedBy: { name: 'Example Org' } })
    expect(evaluate(`m.cardFootnote(${config('')})`)).toBe('Supported by Example Org')
    expect(evaluate(`m.cardFootnote(${config('  ')})`)).toBe('Supported by Example Org')
    expect(evaluate(`m.cardFootnote(${config('12-3456789')})`)).toBe(
      'Supported by Example Org · EIN 12-3456789'
    )
  })

  // Importing the module must not render or write anything: the test above
  // would otherwise overwrite public/og-card.png on every run.
  it('does not render when imported', () => {
    expect(evaluate('m.CARD_WIDTH')).toBe(1200)
    expect(evaluate('m.CARD_HEIGHT')).toBe(630)
  })
})

// The run-as-script guard. It used to compare import.meta.url with
// `file://${process.argv[1]}`, which never matches on Windows (a backslashed
// `C:\...` path against `file:///C:/...`), so `pnpm run og:card` exited 0
// there without rendering anything.
describe('run-as-script guard', () => {
  const url = pathToFileURL(script).href

  it('recognises the script node was started with', () => {
    expect(evaluate(`m.isMainModule(${JSON.stringify(url)}, ${JSON.stringify(script)})`)).toBe(true)
  })

  it('does not fire for another entry point, or with no argv[1]', () => {
    const other = join(process.cwd(), 'scripts', 'png-signature.mjs')
    expect(evaluate(`m.isMainModule(${JSON.stringify(url)}, ${JSON.stringify(other)})`)).toBe(false)
    expect(evaluate(`m.isMainModule(${JSON.stringify(url)}, undefined)`)).toBe(false)
  })

  it('ignores path case on Windows only', () => {
    const upper = JSON.stringify(script.toUpperCase())
    expect(evaluate(`m.isMainModule(${JSON.stringify(url)}, ${upper}, 'win32')`)).toBe(true)
    expect(evaluate(`m.isMainModule(${JSON.stringify(url)}, ${upper}, 'linux')`)).toBe(false)
  })

  it('never builds the file URL by gluing file:// onto the path', () => {
    const source = readFileSync(script, 'utf8')
    expect(source).not.toMatch(/`file:\/\/\$\{/)
  })
})
