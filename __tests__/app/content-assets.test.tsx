import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { readFileSync, readdirSync } from 'node:fs'

/**
 * Every asset a page references must exist in `public/` at exactly that case.
 *
 * GitHub Pages serves from a case-sensitive filesystem. The content images were
 * localized into `public/Images/content/` (capital I, matching the repo's
 * existing `/Images` and `/Svgs` directories) while every page referenced
 * `/images/content/...`. Measured against the real static export:
 *
 *   /images/content/home-01.jpg -> HTTP 404
 *   /Images/content/home-01.jpg -> HTTP 200
 *
 * So all thirteen content images were broken on the deployed site. Nothing
 * caught it: the build copies `public/` verbatim without resolving references,
 * `next/image` with `unoptimized` does not verify the file, the jsdom tests
 * never fetch, and a local preview on a case-insensitive filesystem serves them
 * happily. A case-sensitive existence check is the only thing that sees it.
 */

const REPO_ROOT = process.cwd()
const PUBLIC_DIR = join(REPO_ROOT, 'public')

/** Every `src="/..."` and `assetPath('/...')` reference in the app source. */
function referencedAssets(): { ref: string; file: string }[] {
  const found: { ref: string; file: string }[] = []

  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(full)
        continue
      }
      if (!/\.(tsx?|jsx?)$/.test(entry.name)) continue

      const source = readFileSync(full, 'utf8')
      for (const re of [/src="(\/[^"]+)"/g, /assetPath\('(\/[^']+)'\)/g]) {
        for (const match of source.matchAll(re)) {
          const ref = match[1]
          // Only static files: a route path has no extension, and `/` is the site root.
          if (/\.[A-Za-z0-9]{2,5}$/.test(ref)) found.push({ ref, file: full })
        }
      }
    }
  }

  walk(join(REPO_ROOT, 'src'))
  return found
}

describe('referenced static assets', () => {
  const assets = referencedAssets()

  it('finds asset references to check', () => {
    // Guards the guard: a regex that stops matching would make every assertion
    // below pass vacuously.
    expect(assets.length).toBeGreaterThan(0)
  })

  it.each(assets)('$ref exists in public/ at that exact case', ({ ref }) => {
    // Next.js generated routes (manifest, sitemap, robots) are not files in
    // public/ — they are emitted by the App Router at build time.
    const generated = ['/manifest.webmanifest', '/sitemap.xml', '/robots.txt']
    if (generated.includes(ref)) return

    const onDisk = join(PUBLIC_DIR, ref)
    expect(existsSync(onDisk)).toBe(true)

    // existsSync alone is case-insensitive on macOS and Windows, where most of
    // this work happens. Compare against the directory listing so a case
    // mismatch fails everywhere, not only on Linux.
    const dir = onDisk.slice(0, onDisk.lastIndexOf('/'))
    const base = onDisk.slice(onDisk.lastIndexOf('/') + 1)
    expect(readdirSync(dir)).toContain(base)
  })
})

/**
 * A raw `<a href="/...">` bypasses the GitHub Pages basePath.
 *
 * `next/link` applies `basePath` automatically; a plain anchor does not, so a
 * bare absolute path navigates to the DOMAIN root on a project-path deploy and
 * 404s. Measured before the fix, with NEXT_PUBLIC_BASE_PATH set:
 *
 *   <Link href="/security-acknowledgements">  ->  /FFC-EX-.../security-acknowledgements/
 *   <a href="/security-acknowledgements">     ->  /security-acknowledgements
 *
 * Internal destinations must therefore use `next/link` for routes, or wrap the
 * path in `sitePath()` for a static file that is not a route.
 */
describe('internal links survive a GitHub Pages base path', () => {
  const offenders: { file: string; href: string }[] = []

  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(full)
        continue
      }
      if (!/\.(tsx?|jsx?)$/.test(entry.name)) continue

      const source = readFileSync(full, 'utf8')
      // Raw <a> tags only — <Link> handles basePath itself.
      for (const anchor of source.matchAll(/<a\s[^>]*?href="(\/[^"]*)"/g)) {
        offenders.push({ file: full, href: anchor[1] })
      }
    }
  }
  walk(join(REPO_ROOT, 'src'))

  it('uses next/link or sitePath() for every internal destination', () => {
    expect(offenders).toEqual([])
  })
})
