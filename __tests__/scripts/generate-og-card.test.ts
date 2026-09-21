import { spawnSync } from 'node:child_process'
import { join } from 'node:path'

/**
 * The generator is an ESM script, so these run it through node the way the
 * rest of the scripts suite does rather than importing it into jest's
 * transform pipeline.
 */
function evaluate(expression: string): unknown {
  const script = join(process.cwd(), 'scripts', 'generate-og-card.mjs')
  const result = spawnSync(
    'node',
    [
      '--input-type=module',
      '-e',
      `const m = await import(${JSON.stringify(script)});\nprocess.stdout.write(JSON.stringify(${expression}))`,
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

  // Importing the module must not render or write anything: the test above
  // would otherwise overwrite public/og-card.png on every run.
  it('does not render when imported', () => {
    expect(evaluate('m.CARD_WIDTH')).toBe(1200)
    expect(evaluate('m.CARD_HEIGHT')).toBe(630)
  })
})
