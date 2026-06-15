#!/usr/bin/env node
/**
 * FFC footer-only drift guard.
 *
 * Catches common ways this template can drift away from FFC best practices:
 *  1. Top-level route folders under src/app/ that are not kebab-case.
 *  2. Hardcoded /Images, /Svgs, or /videos paths missing assetPath().
 *  3. Common secret patterns committed under src/ or public/.
 *  4. The template placeholder URL ffcworkingsite1.org left behind after a site rebrands.
 *
 * CSP origin sync is intentionally not checked here. Unlike the full-site
 * template, footer-only currently has no comparable public/_headers plus
 * src/app/layout.tsx CSP meta pair to diff. Add that check when both surfaces
 * exist in this repo.
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

async function checkPlaceholderUrl() {
  const cname = (await readIfExists(join(PUBLIC_DIR, 'CNAME')))?.trim() || null
  const siteMetadata = await readIfExists(join(SRC_DIR, 'lib', 'siteMetadata.ts'))
  const metadataUrl = siteMetadata?.match(/metadataBase:\s*new URL\(['"]([^'"]+)['"]\)/)?.[1]
  const metadataHost = hostnameOf(metadataUrl)

  const cnameRebranded = Boolean(cname && cname !== PLACEHOLDER_HOST)
  const metadataRebranded = Boolean(metadataHost && metadataHost !== PLACEHOLDER_HOST)
  if (!cnameRebranded && !metadataRebranded) return

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
  const customRef = cnameRebranded ? cname : metadataUrl

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

await checkKebabCaseRoutes()
await checkAssetPathUsage()
await checkSecrets()
await checkPlaceholderUrl()

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
