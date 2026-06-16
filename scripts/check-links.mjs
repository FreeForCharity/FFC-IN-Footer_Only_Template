#!/usr/bin/env node
/**
 * Link-check the static export through a local HTTP server.
 *
 * Linkinator's filesystem mode does not match GitHub Pages clean URL handling:
 * `/privacy-policy` should resolve to `out/privacy-policy.html` or
 * `out/privacy-policy/index.html`. Serving `out/` locally keeps CI aligned with
 * the deployed static host without requiring a live deployment.
 */
import { spawn } from 'node:child_process'
import { createReadStream } from 'node:fs'
import { access, stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { dirname, extname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(SCRIPT_DIR, '..')
const DEFAULT_OUT_DIR = join(ROOT, 'out')
const DEFAULT_CONFIG_PATH = join(ROOT, '.linkinatorrc.json')
const HOST = '127.0.0.1'

const CONTENT_TYPES = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.gif', 'image/gif'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.mp4', 'video/mp4'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml; charset=utf-8'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.webmanifest', 'application/manifest+json; charset=utf-8'],
  ['.webp', 'image/webp'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
])

async function statIfExists(path) {
  try {
    return await stat(path)
  } catch {
    return null
  }
}

function isInside(root, path) {
  const rel = relative(root, path)
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
}

function contentType(path) {
  return CONTENT_TYPES.get(extname(path).toLowerCase()) || 'application/octet-stream'
}

async function firstExistingFile(paths) {
  for (const path of paths) {
    const stats = await statIfExists(path)
    if (stats?.isFile()) return path
  }

  return null
}

export async function resolveStaticExportPath(outDir, pathname) {
  let decodedPath
  try {
    decodedPath = decodeURIComponent(pathname)
  } catch {
    return null
  }

  const normalizedPath = decodedPath.replace(/^\/+/, '')
  const requestedPath = resolve(outDir, normalizedPath || '.')

  if (!isInside(outDir, requestedPath)) return null

  const stats = await statIfExists(requestedPath)
  if (stats?.isFile()) return requestedPath
  if (stats?.isDirectory()) {
    const indexPath = await firstExistingFile([join(requestedPath, 'index.html')])
    if (indexPath) return indexPath
  }

  if (extname(requestedPath) === '') {
    const withoutTrailingSlash = requestedPath.replace(/\/+$/, '')
    return firstExistingFile([
      `${withoutTrailingSlash}.html`,
      join(withoutTrailingSlash, 'index.html'),
    ])
  }

  return null
}

async function sendFile(req, res, path, statusCode = 200) {
  const stats = await stat(path)
  res.writeHead(statusCode, {
    'Content-Length': stats.size,
    'Content-Type': contentType(path),
  })

  if (req.method === 'HEAD') {
    res.end()
    return
  }

  createReadStream(path).pipe(res)
}

async function sendNotFound(req, res, outDir) {
  const notFoundPath = await firstExistingFile([join(outDir, '404.html')])
  if (notFoundPath) {
    await sendFile(req, res, notFoundPath, 404)
    return
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
  res.end('Not found')
}

export async function createStaticExportServer(outDir = DEFAULT_OUT_DIR) {
  const root = resolve(outDir)
  await access(root)

  const server = createServer(async (req, res) => {
    try {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405, { Allow: 'GET, HEAD' })
        res.end()
        return
      }

      const url = new URL(req.url || '/', `http://${HOST}`)
      const path = await resolveStaticExportPath(root, url.pathname)
      if (!path) {
        await sendNotFound(req, res, root)
        return
      }

      await sendFile(req, res, path)
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end(error instanceof Error ? error.message : 'Internal server error')
    }
  })

  await new Promise((resolveListen, rejectListen) => {
    server.once('error', rejectListen)
    server.listen(0, HOST, () => {
      server.off('error', rejectListen)
      resolveListen()
    })
  })

  const address = server.address()
  if (!address || typeof address === 'string') {
    await new Promise((resolveClose) => server.close(resolveClose))
    throw new Error('Failed to start link-check HTTP server.')
  }

  return {
    url: `http://${HOST}:${address.port}`,
    close: () => new Promise((resolveClose) => server.close(resolveClose)),
  }
}

export function linkinatorArgs(url, configPath = DEFAULT_CONFIG_PATH) {
  return [url, '--recurse', '--config', configPath]
}

function defaultLinkinatorBin() {
  if (process.env.LINKINATOR_BIN) return process.env.LINKINATOR_BIN

  const binName = process.platform === 'win32' ? 'linkinator.cmd' : 'linkinator'
  return join(ROOT, 'node_modules', '.bin', binName)
}

export async function runLinkinator(url, options = {}) {
  const command = options.command || defaultLinkinatorBin()
  const args = options.args || linkinatorArgs(url, options.configPath || DEFAULT_CONFIG_PATH)

  return new Promise((resolveRun) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      shell: process.platform === 'win32',
      stdio: 'inherit',
    })

    child.on('error', (error) => {
      console.error(`Failed to start linkinator: ${error.message}`)
      resolveRun(1)
    })
    child.on('close', (code) => resolveRun(code ?? 1))
  })
}

async function main() {
  const outDir = resolve(process.env.FFC_CHECK_LINKS_OUT_DIR || DEFAULT_OUT_DIR)
  const configPath = resolve(process.env.FFC_CHECK_LINKS_CONFIG || DEFAULT_CONFIG_PATH)
  const server = await createStaticExportServer(outDir)

  try {
    console.log(`Checking links from ${server.url} (serving ${relative(ROOT, outDir) || '.'})`)
    const code = await runLinkinator(server.url, { configPath })
    process.exitCode = code
  } finally {
    await server.close()
  }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
