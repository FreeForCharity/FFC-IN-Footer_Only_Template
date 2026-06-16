#!/usr/bin/env node
/**
 * Post-deploy smoke check for FFC template sites.
 *
 * Usage: node scripts/smoke-check.mjs <base-url>
 *
 * Verifies that everything the template ships actually serves on the
 * deployed site:
 *   - Home page is reachable, status 200, renders footer-only critical UI,
 *     includes a CSP <meta> tag, theme-color, OG / Twitter cards, and a
 *     <link rel="manifest">
 *   - Footer policy routes are 200 and render policy headings
 *   - /robots.txt is 200 and lists Sitemap:
 *   - /sitemap.xml is 200 and contains <urlset>
 *   - /.well-known/security.txt or /security.txt is 200 with a Contact: line
 *     and a future RFC 3339 Expires: date
 *   - /site.webmanifest (or /manifest.webmanifest if a child site adds one)
 *     returns 200 JSON with name + icons
 *   - 404 page is branded when the deployment serves a branded 404
 *   - favicon.ico and icon.png are reachable
 *
 * Includes the retry-with-backoff the inline Python script had so the
 * check survives Pages-propagation lag right after a deploy.
 *
 * Exit codes:
 *   0  every check passed
 *   1  one or more checks failed (details on stderr)
 *   2  invalid usage
 */

const baseArg = process.argv[2]
if (!baseArg) {
  console.error('Usage: node scripts/smoke-check.mjs <base-url>')
  process.exit(2)
}
const BASE = baseArg.replace(/\/$/, '')

const TOTAL_DEADLINE_MS = 180 * 1000
const REQUEST_TIMEOUT_MS = 15 * 1000
const RETRY_DELAY_MS = 5 * 1000
const deadline = Date.now() + TOTAL_DEADLINE_MS
const RFC3339 = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-]\d{2}:\d{2})$/

function isSemanticallyValidRfc3339(raw) {
  const match = raw.match(RFC3339)
  if (!match) return false
  const [, yearRaw, monthRaw, dayRaw, hourRaw, minuteRaw, secondRaw, zoneRaw] = match
  const year = Number(yearRaw)
  const month = Number(monthRaw)
  const day = Number(dayRaw)
  const hour = Number(hourRaw)
  const minute = Number(minuteRaw)
  const second = Number(secondRaw)
  if (month < 1 || month > 12) return false
  if (hour > 23 || minute > 59 || second > 59) return false
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  if (day < 1 || day > daysInMonth) return false
  if (zoneRaw !== 'Z') {
    const [offsetHourRaw, offsetMinuteRaw] = zoneRaw.slice(1).split(':')
    if (Number(offsetHourRaw) > 23 || Number(offsetMinuteRaw) > 59) return false
  }
  return !Number.isNaN(new Date(raw).getTime())
}

async function fetchWithRetry(path, options = {}) {
  const retry404 = options.retry404 !== false
  const url = `${BASE}${path}`
  let lastErr = null
  for (let attempt = 1; Date.now() < deadline; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        redirect: 'follow',
        headers: { 'User-Agent': 'ffc-smoke-check' },
      })
      clearTimeout(timer)
      // Retry on 5xx/429 and (during post-deploy propagation) 404.
      // Callers can disable 404 retry for expected fallback probes.
      if (res.status >= 500 || res.status === 429 || (retry404 && res.status === 404)) {
        lastErr = `HTTP ${res.status}`
        await sleep(RETRY_DELAY_MS)
        continue
      }
      return res
    } catch (err) {
      clearTimeout(timer)
      lastErr = err && err.message ? err.message : String(err)
      await sleep(RETRY_DELAY_MS)
    }
  }
  throw new Error(`Fetch deadline exceeded for ${url}: ${lastErr}`)
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

const results = []
function record(name, ok, detail = '') {
  results.push({ name, ok, detail })
  const mark = ok ? '✓' : '✗'
  const line = detail ? `${mark} ${name} — ${detail}` : `${mark} ${name}`
  console.log(line)
}

async function expect200(path, name = path) {
  try {
    const res = await fetchWithRetry(path)
    record(name, res.status === 200, `HTTP ${res.status}`)
    return res
  } catch (err) {
    record(name, false, err.message)
    return null
  }
}

async function smoke() {
  console.log(`Smoke checking ${BASE}\n`)

  // 1. Home page.
  const homeRes = await expect200('/', 'home page returns 200')
  if (homeRes) {
    const html = await homeRes.text()
    record(
      'home has Content-Security-Policy <meta>',
      /<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]+content=/i.test(html)
    )
    record('home has <meta name="theme-color">', /<meta[^>]+name=["']theme-color["']/i.test(html))
    record('home has Open Graph title', /<meta[^>]+property=["']og:title["']/i.test(html))
    record('home has Twitter card meta', /<meta[^>]+name=["']twitter:card["']/i.test(html))
    record('home has <link rel="manifest">', /<link[^>]+rel=["']manifest["']/i.test(html))
    record(
      'home renders footer',
      /<footer[\s>]/i.test(html) || /Free For Charity Policy/i.test(html)
    )
    record(
      'home renders footer policy links',
      /privacy-policy/i.test(html) && /terms-of-service/i.test(html)
    )
    record(
      'home advertises strict referrer policy',
      /<meta[^>]+name=["']referrer["'][^>]+content=["']strict-origin-when-cross-origin["']/i.test(
        html
      )
    )
  }

  // 2. Footer policy routes.
  const policyRoutes = [
    ['/privacy-policy', /Privacy Policy/i],
    ['/cookie-policy', /Cookie Policy/i],
    ['/terms-of-service', /Terms of Service/i],
    ['/donation-policy', /Donation Policy/i],
    ['/free-for-charity-donation-policy', /Donation Policy/i],
    ['/security-acknowledgements', /Security Acknowledgements/i],
    ['/vulnerability-disclosure-policy', /Vulnerability Disclosure Policy/i],
  ]
  for (const [path, headingPattern] of policyRoutes) {
    let res = await expect200(path, `${path} returns 200`)
    if (!res) continue
    let body = await res.text()
    let headingOk = headingPattern.test(body)

    // Local static servers often SPA-fallback extensionless paths to the home
    // page, while GitHub Pages resolves the exported .html file. Verify the
    // concrete artifact too so local smoke matches production Pages behavior.
    if (!headingOk && !path.endsWith('.html')) {
      const htmlRes = await fetchWithRetry(`${path}.html`).catch(() => null)
      if (htmlRes && htmlRes.status === 200) {
        body = await htmlRes.text()
        headingOk = headingPattern.test(body)
      }
    }

    record(`${path} renders expected policy heading`, headingOk)
  }

  // 3. robots + sitemap.
  const robotsRes = await expect200('/robots.txt')
  if (robotsRes) {
    const body = await robotsRes.text()
    record('robots.txt references Sitemap:', /^Sitemap:\s+https?:/im.test(body))
  }
  const sitemapRes = await expect200('/sitemap.xml')
  if (sitemapRes) {
    const body = await sitemapRes.text()
    record('sitemap.xml has <urlset>', /<urlset[\s>]/.test(body))
    record('sitemap.xml lists at least one URL', /<loc>https?:\/\//.test(body))
  }

  // 3. security.txt — try /.well-known/security.txt first (RFC 9116 §3
  // canonical location), fall back to /security.txt (root fallback that
  // ships because GitHub Pages does NOT serve dot-prefixed directories).
  // The check passes if EITHER serves a valid RFC 9116 file; we surface
  // which one we hit so deploys on Cloudflare/Netlify (both should work)
  // vs GH-Pages (only the root copy will serve) are visible.
  async function tryText(path, options = {}) {
    try {
      const r = await fetchWithRetry(path, options)
      if (r.status === 200) return { path, body: await r.text() }
    } catch {
      /* fall through */
    }
    return null
  }
  const secFile =
    (await tryText('/.well-known/security.txt', { retry404: false })) ??
    (await tryText('/security.txt'))
  if (!secFile) {
    record('security.txt served at /.well-known/security.txt or /security.txt', false)
  } else {
    record(`security.txt served at ${secFile.path}`, true)
    const contactMatch = /^Contact:\s*(.+)$/im.exec(secFile.body)
    record('security.txt has Contact:', !!contactMatch, contactMatch?.[1]?.trim() || '')
    const expiresMatch = /^Expires:\s*(.+)$/im.exec(secFile.body)
    if (expiresMatch) {
      const rawExpires = expiresMatch[1].trim()
      const expires = new Date(rawExpires)
      const valid = isSemanticallyValidRfc3339(rawExpires) && expires.getTime() > Date.now()
      record('security.txt Expires is in the future', valid, rawExpires)
    } else {
      record('security.txt has Expires:', false)
    }
  }

  // 5. Manifest. Footer-only currently ships /site.webmanifest; keep
  // /manifest.webmanifest as a forward-compatible fallback for child sites.
  let manifestPath = '/site.webmanifest'
  let manifestRes = await fetchWithRetry(manifestPath, { retry404: false }).catch(() => null)
  if (!manifestRes || manifestRes.status === 404) {
    manifestPath = '/manifest.webmanifest'
    manifestRes = await fetchWithRetry(manifestPath, { retry404: false }).catch(() => null)
  }
  if (!manifestRes || manifestRes.status !== 200) {
    record('manifest served at /site.webmanifest or /manifest.webmanifest', false)
  } else {
    record(`manifest served at ${manifestPath}`, true, `HTTP ${manifestRes.status}`)
    const ct = manifestRes.headers.get('content-type') || ''
    let manifest = null
    try {
      manifest = await manifestRes.json()
    } catch {
      record(`${manifestPath} parses as JSON`, false, `content-type: ${ct}`)
    }
    if (manifest) {
      record('manifest has name', !!manifest.name, manifest.name || '')
      record(
        'manifest has icons[]',
        Array.isArray(manifest.icons) && manifest.icons.length > 0,
        `${manifest.icons?.length ?? 0} icon(s)`
      )
      record(
        'manifest has theme_color or background_color',
        !!(manifest.theme_color || manifest.background_color)
      )
      // Verify every icon URL the manifest advertises actually resolves.
      // Catches the bug fixed in #319: a custom-domain deploy with
      // NEXT_PUBLIC_BASE_PATH=/repo would emit icon srcs like
      // /repo/android-chrome-192x192.png that 404 on the root-served
      // custom domain. The PWA install prompt fails silently otherwise.
      if (Array.isArray(manifest.icons)) {
        for (const icon of manifest.icons) {
          if (!icon?.src) continue
          const iconUrl = icon.src.startsWith('http')
            ? icon.src
            : icon.src.startsWith('/')
              ? icon.src
              : `/${icon.src}`
          const iconPath = iconUrl.startsWith('http') ? iconUrl.replace(BASE, '') : iconUrl
          const r = await fetchWithRetry(iconPath).catch(() => null)
          const ok = r && r.status === 200
          record(`manifest icon ${icon.src} resolves`, ok, r ? `HTTP ${r.status}` : 'fetch failed')
        }
      }
    }
  }

  // 6. 404 route. Footer-only does not currently ship a branded not-found
  // route, so assert that the host returns a deterministic 404/200 fallback
  // and surface whether a branded heading is present without failing on it.
  const notFoundUrl = `/this-page-definitely-does-not-exist-${Date.now()}`
  const notFoundRes = await fetchWithRetry(notFoundUrl, { retry404: false }).catch(() => null)
  if (!notFoundRes) {
    record('404 fallback route reachable', false)
  } else {
    const body = await notFoundRes.text()
    record(
      '404 fallback route reachable',
      notFoundRes.status === 404 || notFoundRes.status === 200,
      `status ${notFoundRes.status}`
    )
    const branded = /can[&#x27;']?t find that page|Free For Charity/i.test(body)
    record(
      '404 fallback is branded when present',
      true,
      branded ? 'branded' : 'generic host fallback'
    )
  }

  // 7. Favicon + icon are reachable.
  await expect200('/favicon.ico')
  await expect200('/icon.png')

  // 7. Summary.
  const failed = results.filter((r) => !r.ok)
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
  if (failed.length) {
    console.error('\nFailures:')
    for (const r of failed) console.error(`  - ${r.name}${r.detail ? ` (${r.detail})` : ''}`)
    process.exit(1)
  }
}

smoke().catch((err) => {
  console.error('\nSmoke check crashed:', err && err.stack ? err.stack : err)
  process.exit(1)
})
