#!/usr/bin/env node
/**
 * FFC footer-only drift guard.
 *
 * Catches common ways this template can drift away from FFC best practices:
 *  1. Top-level route folders under src/app/ that are not kebab-case.
 *  2. Hardcoded /Images, /Svgs, or /videos paths missing assetPath().
 *  3. Common secret patterns committed under src/ or public/.
 *  4. The template placeholder URL ffcworkingsite1.org left behind after a site rebrands.
 *  5. Static security metadata (_headers and security.txt) drifting away from
 *     footer-only runtime origins or src/lib/site.config.ts.
 */
import { readdir, readFile } from 'node:fs/promises'
import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const ROOT = join(SCRIPT_DIR, '..')
const APP_DIR = join(ROOT, 'src', 'app')
const SRC_DIR = join(ROOT, 'src')
const PUBLIC_DIR = join(ROOT, 'public')

const errors = []
const warnings = []

const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const APP_RESERVED = new Set(['api', '_components', '_lib'])
const PLACEHOLDER_HOST = 'ffcworkingsite1.org'
const GITHUB_PAGES_PROJECT_PATH = '/FFC-IN-Footer_Only_Template'
const SECURITY_TXT_RFC3339 =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-]\d{2}:\d{2})$/

const SYNCED_CSP_DIRECTIVES = [
  'default-src',
  'script-src',
  'style-src',
  'img-src',
  'font-src',
  'connect-src',
  'frame-src',
  'media-src',
  'form-action',
  'object-src',
  'base-uri',
  'upgrade-insecure-requests',
]

async function walk(dir, predicate, results = []) {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return results
  }

  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
      await walk(full, predicate, results)
    } else if (predicate(entry.name)) {
      results.push(full)
    }
  }

  return results
}

function lineAt(body, index) {
  return body.slice(0, index).split('\n').length
}

function insideComment(body, index) {
  const lineStart = body.lastIndexOf('\n', index - 1) + 1
  const line = body.slice(lineStart, index)
  if (/(^|[^:])\/\//.test(line)) return true

  const beforeOpen = body.lastIndexOf('/*', index)
  if (beforeOpen === -1) return false
  const beforeClose = body.lastIndexOf('*/', index)
  return beforeOpen > beforeClose
}

function hostnameOf(rawUrl) {
  if (!rawUrl) return null
  try {
    return new URL(rawUrl).hostname
  } catch {
    return null
  }
}

async function readIfExists(path) {
  try {
    return await readFile(path, 'utf8')
  } catch {
    return null
  }
}

function extractStringProperty(body, property) {
  const match = body.match(new RegExp(`${property}:\\s*['"\`]([^'"\`]+)['"\`]`))
  return match?.[1] ?? null
}

function isSemanticallyValidRfc3339(raw) {
  const match = raw.match(SECURITY_TXT_RFC3339)
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
    const offsetHour = Number(offsetHourRaw)
    const offsetMinute = Number(offsetMinuteRaw)
    if (offsetHour > 23 || offsetMinute > 59) return false
  }

  return !Number.isNaN(new Date(raw).getTime())
}

async function readSiteConfig() {
  const path = join(SRC_DIR, 'lib', 'site.config.ts')
  const body = await readIfExists(path)
  if (!body) {
    errors.push('src/lib/site.config.ts is missing. Restore it from the template.')
    return null
  }

  return {
    body,
    url: extractStringProperty(body, 'url'),
    contactEmail: extractStringProperty(body, 'contactEmail'),
    vulnerabilityDisclosurePath:
      extractStringProperty(body, 'vulnerabilityDisclosurePath') ||
      '/vulnerability-disclosure-policy',
  }
}

function extractCspDirectives(policy) {
  const directives = new Map()
  if (!policy) return directives

  for (const part of policy.split(';')) {
    const trimmed = part.trim()
    if (!trimmed) continue
    const [name, ...sources] = trimmed.split(/\s+/)
    directives.set(name, new Set(sources))
  }

  return directives
}

function quotedStrings(body) {
  const values = []
  const pattern = /(["'`])((?:\\.|(?!\1)[\s\S])*?)\1/g
  let match
  while ((match = pattern.exec(body))) {
    values.push(match[2].replace(/\\(["'`])/g, '$1'))
  }
  return values
}

function extractLayoutCsp(layoutBody) {
  const constArrayMatch = layoutBody.match(
    /const\s+contentSecurityPolicy\s*=\s*\[([\s\S]*?)\]\.join\(\s*['"`];\s*['"`]\s*\)/
  )
  if (constArrayMatch) return quotedStrings(constArrayMatch[1]).join('; ')

  const metaTagMatch = layoutBody.match(
    /<meta\s+[^>]*httpEquiv=["']Content-Security-Policy["'][^>]*>/
  )
  const directMatch =
    metaTagMatch?.[0].match(/content="([^"]+)"/) ||
    metaTagMatch?.[0].match(/content='([^']+)'/) ||
    metaTagMatch?.[0].match(/content=\{`([^`]+)`\}/)
  if (directMatch) return directMatch[1]

  return null
}

function securityTxtPayload(body) {
  return body
    .split('\n')
    .filter((line) => !line.startsWith('#') && line.trim() !== '')
    .join('\n')
    .trim()
}

async function checkKebabCaseRoutes() {
  let entries
  try {
    entries = await readdir(APP_DIR, { withFileTypes: true })
  } catch {
    return
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    if (entry.name.startsWith('(') || entry.name.startsWith('_')) continue
    if (entry.name.startsWith('@')) continue
    if (APP_RESERVED.has(entry.name)) continue

    if (!KEBAB_CASE.test(entry.name)) {
      errors.push(
        `Route folder "src/app/${entry.name}" is not kebab-case. ` +
          'Rename it to lowercase letters and digits separated by hyphens.'
      )
    }
  }
}

async function checkAssetPathUsage() {
  const files = await walk(SRC_DIR, (name) => /\.(tsx?|jsx?)$/.test(name))
  const literalPattern = /(["'`])(\/(?:Images|Svgs|videos)\/[^"'`\n]+?)\1/g
  const templateBasePattern = /\$\{[^}]*basePath[^}]*\}\/(?:Images|Svgs|videos)\//g
  const wrappedInAssetPath = /assetPath\s*\([^)]*$/

  for (const file of files) {
    const rel = relative(ROOT, file)
    if (rel.includes('__tests__') || rel.startsWith('tests' + sep)) continue
    if (rel === join('src', 'lib', 'assetPath.ts')) continue

    const body = await readFile(file, 'utf8')

    literalPattern.lastIndex = 0
    let match
    while ((match = literalPattern.exec(body))) {
      if (insideComment(body, match.index)) continue
      const lookback = body.slice(Math.max(0, match.index - 400), match.index)
      if (wrappedInAssetPath.test(lookback)) continue

      errors.push(
        `${rel}:${lineAt(body, match.index)} references "${match[2]}" without assetPath(). ` +
          `Wrap it with assetPath('${match[2]}') so GitHub Pages subpath deploys keep working.`
      )
    }

    templateBasePattern.lastIndex = 0
    while ((match = templateBasePattern.exec(body))) {
      if (insideComment(body, match.index)) continue
      errors.push(
        `${rel}:${lineAt(body, match.index)} hand-rolls basePath asset concatenation. ` +
          "Use assetPath('/Images/...'), assetPath('/Svgs/...'), or assetPath('/videos/...') instead."
      )
    }
  }
}

async function checkSecrets() {
  const interestingFile = (name) =>
    /\.(tsx?|jsx?|json|md|yml|yaml|txt|webmanifest)$/.test(name) ||
    name === 'CNAME' ||
    name === '_headers'
  const files = [
    ...(await walk(SRC_DIR, interestingFile)),
    ...(await walk(PUBLIC_DIR, interestingFile)),
  ]
  const secretPatterns = [
    { name: 'AWS access key', re: /\bAKIA[0-9A-Z]{16}\b/ },
    { name: 'Google API key', re: /\bAIza[0-9A-Za-z_-]{35}\b/ },
    { name: 'GitHub personal access token', re: /\bghp_[A-Za-z0-9]{36,}\b/ },
    { name: 'GitHub fine-grained token', re: /\bgithub_pat_[A-Za-z0-9_]{82,}\b/ },
    { name: 'Slack token', re: /\bxox[abeprs]-[A-Za-z0-9-]{10,}\b/ },
    { name: 'private key block', re: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/ },
  ]

  for (const file of files) {
    const body = await readFile(file, 'utf8')
    for (const pattern of secretPatterns) {
      if (!pattern.re.test(body)) continue
      errors.push(
        `Possible ${pattern.name} committed in ${relative(ROOT, file)}. ` +
          'Move it to a gitignored .env file or GitHub Secrets and rotate the credential.'
      )
    }
  }
}

async function checkPlaceholderUrl(siteConfig) {
  const cname = (await readIfExists(join(PUBLIC_DIR, 'CNAME')))?.trim() || null
  const configUrl = siteConfig?.url ?? null
  const configHost = hostnameOf(configUrl)

  const cnameRebranded = Boolean(cname && cname !== PLACEHOLDER_HOST)
  const configRebranded = Boolean(configHost && configHost !== PLACEHOLDER_HOST)
  if (!cnameRebranded && !configRebranded) return

  const interestingFile = (name) =>
    /\.(tsx?|jsx?|md|mdx|txt|json|yml|yaml|webmanifest)$/.test(name) ||
    name === 'CNAME' ||
    name === '_headers'
  const candidates = [
    ...(await walk(SRC_DIR, interestingFile)),
    ...(await walk(PUBLIC_DIR, interestingFile)),
    join(ROOT, 'next.config.ts'),
    join(ROOT, 'package.json'),
    join(ROOT, 'README.md'),
  ]
  const customRef = cnameRebranded ? cname : configUrl

  for (const file of candidates) {
    const body = await readIfExists(file)
    if (!body) continue
    if (!body.includes(PLACEHOLDER_HOST)) continue

    const rel = relative(ROOT, file)
    warnings.push(
      `${rel}:${lineAt(body, body.indexOf(PLACEHOLDER_HOST))} still references ` +
        `${PLACEHOLDER_HOST} after this site rebranded to "${customRef}".`
    )
  }
}

function checkSiteConfigUrl(siteConfig) {
  if (!siteConfig) return
  const raw = siteConfig.url

  if (!raw) {
    errors.push('src/lib/site.config.ts: siteConfig.url is missing.')
    return
  }

  if (!raw.startsWith('https://')) {
    errors.push(
      `src/lib/site.config.ts: siteConfig.url "${raw}" must start with "https://". ` +
        'metadataBase, sitemap, robots, and security.txt require a production HTTPS origin.'
    )
  }

  if (raw.endsWith('/')) {
    errors.push(
      `src/lib/site.config.ts: siteConfig.url "${raw}" must not end with "/". ` +
        'Use the bare origin and let siteUrl() append paths.'
    )
  }

  try {
    const parsed = new URL(raw)
    if (parsed.pathname !== '/' && parsed.pathname !== '') {
      errors.push(
        `src/lib/site.config.ts: siteConfig.url "${raw}" should be the bare origin with no path.`
      )
    }
  } catch {
    errors.push(`src/lib/site.config.ts: siteConfig.url "${raw}" is not a parseable URL.`)
  }
}

async function checkCspSync() {
  const headersBody = await readIfExists(join(PUBLIC_DIR, '_headers'))
  const layoutBody = await readIfExists(join(SRC_DIR, 'app', 'layout.tsx'))

  if (!headersBody) {
    errors.push(
      'public/_headers is missing. Add static security headers for Cloudflare/Netlify-compatible hosts.'
    )
  }

  if (!layoutBody) {
    errors.push('src/app/layout.tsx is missing. Restore the root layout with CSP metadata.')
  }

  if (!headersBody || !layoutBody) return

  const headersMatch = headersBody.match(/Content-Security-Policy:\s*([^\n]+)/)
  const layoutPolicy = extractLayoutCsp(layoutBody)

  if (!headersMatch) {
    errors.push(
      'public/_headers has no Content-Security-Policy directive. Add one with footer-only origins.'
    )
  }

  if (!layoutPolicy) {
    errors.push(
      'src/app/layout.tsx has no Content-Security-Policy meta tag. Add one for GitHub Pages deploys.'
    )
  }

  if (!headersMatch || !layoutPolicy) return

  const headersCsp = extractCspDirectives(headersMatch[1])
  const layoutCsp = extractCspDirectives(layoutPolicy)

  for (const directive of SYNCED_CSP_DIRECTIVES) {
    const headerHasDirective = headersCsp.has(directive)
    const layoutHasDirective = layoutCsp.has(directive)

    if (headerHasDirective !== layoutHasDirective) {
      errors.push(
        `CSP "${directive}" drifted between public/_headers and src/app/layout.tsx - ` +
          `${headerHasDirective ? 'only in _headers' : 'only in layout.tsx'}. ` +
          'Update both surfaces in the same change.'
      )
      continue
    }

    const headerSources = headersCsp.get(directive) || new Set()
    const layoutSources = layoutCsp.get(directive) || new Set()
    const onlyInHeaders = [...headerSources].filter((source) => !layoutSources.has(source))
    const onlyInLayout = [...layoutSources].filter((source) => !headerSources.has(source))

    if (!onlyInHeaders.length && !onlyInLayout.length) continue

    const details = []
    if (onlyInHeaders.length) details.push(`only in _headers: ${onlyInHeaders.join(' ')}`)
    if (onlyInLayout.length) details.push(`only in layout.tsx: ${onlyInLayout.join(' ')}`)
    errors.push(
      `CSP "${directive}" drifted between public/_headers and src/app/layout.tsx - ` +
        `${details.join(' / ')}. Update both surfaces in the same change.`
    )
  }
}

async function checkSecurityTxtSync(siteConfig) {
  const wellKnownPath = join(PUBLIC_DIR, '.well-known', 'security.txt')
  const rootPath = join(PUBLIC_DIR, 'security.txt')
  const wellKnownBody = await readIfExists(wellKnownPath)
  const rootBody = await readIfExists(rootPath)

  if (!wellKnownBody) {
    errors.push('public/.well-known/security.txt is missing. Add the RFC 9116 well-known copy.')
  }

  if (!rootBody) {
    errors.push(
      'public/security.txt is missing. Add the root-path fallback for GitHub Pages compatibility.'
    )
  }

  if (!wellKnownBody || !rootBody) return

  const wellKnownPayload = securityTxtPayload(wellKnownBody)
  const rootPayload = securityTxtPayload(rootBody)

  if (wellKnownPayload !== rootPayload) {
    errors.push(
      'public/security.txt and public/.well-known/security.txt have drifted. ' +
        'Their non-comment Contact/Expires/Canonical/Policy/Acknowledgments payloads must match.'
    )
  }

  const expires = wellKnownPayload.match(/^Expires:\s*(.+)$/m)?.[1]?.trim()
  if (!expires) {
    errors.push('public/.well-known/security.txt is missing the required Expires line.')
  } else if (!isSemanticallyValidRfc3339(expires)) {
    errors.push(
      `public/.well-known/security.txt Expires value "${expires}" is not a parseable RFC 3339 datetime.`
    )
  } else {
    const expiresAt = new Date(expires).getTime()
    if (expiresAt <= Date.now()) {
      errors.push(
        `public/.well-known/security.txt Expires value "${expires}" must be in the future.`
      )
    }
  }

  if (!siteConfig?.url) return
  const origin = siteConfig.url.replace(/\/$/, '')
  const expectedLines = [
    siteConfig.contactEmail ? `Contact: mailto:${siteConfig.contactEmail}` : null,
    'Preferred-Languages: en',
    `Canonical: ${origin}/.well-known/security.txt`,
    `Canonical: ${origin}/security.txt`,
    `Canonical: ${origin}${GITHUB_PAGES_PROJECT_PATH}/.well-known/security.txt`,
    `Canonical: ${origin}${GITHUB_PAGES_PROJECT_PATH}/security.txt`,
    `Policy: ${origin}${siteConfig.vulnerabilityDisclosurePath}`,
    `Policy: ${origin}${GITHUB_PAGES_PROJECT_PATH}${siteConfig.vulnerabilityDisclosurePath}`,
    `Acknowledgments: ${origin}/security-acknowledgements`,
    `Acknowledgments: ${origin}${GITHUB_PAGES_PROJECT_PATH}/security-acknowledgements`,
  ].filter(Boolean)

  for (const line of expectedLines) {
    if (wellKnownPayload.includes(line)) continue
    errors.push(
      `public/.well-known/security.txt is not aligned with src/lib/site.config.ts. Missing: ${line}`
    )
  }
}

const siteConfig = await readSiteConfig()
checkSiteConfigUrl(siteConfig)
await checkKebabCaseRoutes()
await checkAssetPathUsage()
await checkSecrets()
await checkPlaceholderUrl(siteConfig)
await checkCspSync()
await checkSecurityTxtSync(siteConfig)

if (warnings.length) {
  console.warn('\nDrift warnings:')
  for (const warning of warnings) console.warn(`  - ${warning}`)
}

if (errors.length) {
  console.error('\nDrift errors:')
  for (const error of errors) console.error(`  - ${error}`)
  console.error('\nFix these issues before merging.')
  process.exit(1)
}

console.log(
  warnings.length
    ? `\nNo drift errors (${warnings.length} warning${warnings.length === 1 ? '' : 's'}).`
    : '\nNo drift detected. Repo aligned with FFC footer-only best practices.'
)
