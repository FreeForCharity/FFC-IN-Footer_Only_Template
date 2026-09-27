import { spawn } from 'node:child_process'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { join } from 'node:path'

/**
 * The smoke check must TERMINATE. That is the whole subject of this file, and
 * it is separate from whether its checks pass.
 *
 * On 2026-09-27 the post-deploy job failed twice on `main` like this:
 *
 *     20:35:56  41/41 checks passed
 *     20:41:08  ##[error]The action 'Post-deploy smoke check' has timed out
 *                         after 5 minutes.
 *
 * Every check had passed and the summary had printed. The deploy itself had
 * succeeded and the site was live and correct — the job's red was the script
 * refusing to exit, and each failure opened a "Production deployment failed"
 * incident issue for a deployment that had not failed.
 *
 * The cause is an unread `fetch` body: it holds its socket open and ref'd, so
 * node's event loop never drains. It does not reproduce everywhere — against
 * the same URL from a different network the script exits in 8 seconds —
 * because whether the socket lingers depends on the server's keep-alive.
 *
 * TWO THINGS MAKE THIS TEST DISCRIMINATE, AND IT IS WORTHLESS WITHOUT EITHER.
 *
 * 1. `keepAliveTimeout` is set high. At node's 5s default the socket closes
 *    on its own and the script exits whether or not the bug is present.
 *
 * 2. THE FIXTURE MUST MAKE EVERY CHECK PASS. The first draft of this test
 *    served a stub that answered 200 with a placeholder body, so several
 *    content assertions failed — and the pre-fix script called
 *    `process.exit(1)` on the failure path, so it exited cleanly and the test
 *    passed against the unfixed code. The hang only ever existed on the
 *    ALL-PASS path, which had no `process.exit` at all. Verified by reverting
 *    the fix and re-running: the stub version passed, this version hangs.
 *
 * Hence the `expect(code).toBe(0)`: if a future check is added and this
 * fixture no longer satisfies it, the test goes red and asks to be updated,
 * rather than silently reverting to a test of nothing.
 */
const SCRIPT = join(process.cwd(), 'scripts', 'smoke-check.mjs')

/** Comfortably above the observed 8s good case, far below the 5min CI timeout. */
const EXIT_BUDGET_MS = 60_000

const HOME_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'" />
    <meta name="theme-color" content="#ffffff" />
    <meta name="referrer" content="strict-origin-when-cross-origin" />
    <meta property="og:title" content="Fixture" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="manifest" href="/manifest.webmanifest" />
  </head>
  <body>
    <footer>
      <a href="/privacy-policy">Privacy Policy</a>
      <a href="/terms-of-service">Terms of Service</a>
    </footer>
  </body>
</html>`

function policyPage(heading: string): string {
  return `<!doctype html><html><body><h1>${heading}</h1></body></html>`
}

/** Far enough out that the fixture does not expire and start failing. */
const EXPIRES = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()

const ROUTES: Record<string, { type: string; body: string }> = {
  '/': { type: 'text/html; charset=utf-8', body: HOME_HTML },
  '/privacy-policy': { type: 'text/html', body: policyPage('Privacy Policy') },
  '/cookie-policy': { type: 'text/html', body: policyPage('Cookie Policy') },
  '/terms-of-service': { type: 'text/html', body: policyPage('Terms of Service') },
  '/donation-policy': { type: 'text/html', body: policyPage('Donation Policy') },
  '/free-for-charity-donation-policy': { type: 'text/html', body: policyPage('Donation Policy') },
  '/security-acknowledgements': {
    type: 'text/html',
    body: policyPage('Security Acknowledgements'),
  },
  '/vulnerability-disclosure-policy': {
    type: 'text/html',
    body: policyPage('Vulnerability Disclosure Policy'),
  },
  '/robots.txt': {
    type: 'text/plain',
    body: 'User-agent: *\nAllow: /\nSitemap: https://example.invalid/sitemap.xml\n',
  },
  '/sitemap.xml': {
    type: 'application/xml',
    body: '<?xml version="1.0"?><urlset><url><loc>https://example.invalid/</loc></url></urlset>',
  },
  '/.well-known/security.txt': {
    type: 'text/plain',
    body: `Contact: mailto:security@example.invalid\nExpires: ${EXPIRES}\n`,
  },
  '/manifest.webmanifest': {
    type: 'application/manifest+json',
    body: JSON.stringify({
      name: 'Fixture',
      theme_color: '#ffffff',
      icons: [
        { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
      ],
    }),
  },
  // SIZE IS PART OF THE FIXTURE, NOT DECORATION. The script fetches these
  // and never reads their bodies. A body small enough to arrive in one go is
  // buffered and the request completes, so a few bytes here reproduces
  // nothing; a body that does not fit leaves the response stream attached to
  // a live socket, which is what stops node exiting.
  //
  // This is also why the bug appeared when it did. The real
  // android-chrome-512x512.png was 101,689 bytes while it was the template's
  // mostly-white wordmark, and became 340,249 bytes when it was replaced with
  // the charity's photographic badge in #41 — and the post-deploy job started
  // timing out on that same merge.
  '/android-chrome-192x192.png': { type: 'image/png', body: 'x'.repeat(66_843) },
  '/android-chrome-512x512.png': { type: 'image/png', body: 'x'.repeat(340_249) },
  '/favicon.ico': { type: 'image/x-icon', body: 'x'.repeat(8_355) },
  '/icon.png': { type: 'image/png', body: 'x'.repeat(2_436) },
}

/**
 * Paths that answer 5xx a set number of times before succeeding, so the
 * retry branch of fetchWithRetry can be exercised. Reset per test.
 */
const failuresRemaining = new Map<string, number>()

/**
 * Serves a home page that is 200 but satisfies none of the content
 * assertions, so the run fails FAST.
 *
 * A wrong body is the right way to force a failure here. The obvious
 * alternative -- pointing the script at an unroutable port -- makes every
 * fetch throw, and the script then retries each one until its 180s deadline:
 * the first draft of this test took 66 seconds and was killed by the
 * harness rather than exiting. A 200 with the wrong content is recorded as
 * a failure immediately and never retried.
 */
let serveBrokenHome = false

function startKeepAliveServer(): Promise<Server> {
  const server = createServer((req, res) => {
    const path = (req.url ?? '/').split('?')[0]

    // The retry branch discards a response WITHOUT anyone reading it, so the
    // error body here is deliberately large: a few bytes are buffered and
    // hold nothing, while a body that does not fit pins a socket for the
    // whole retry loop. That loop runs precisely when a deploy is least
    // healthy, which is the worst possible time to hang.
    const remaining = failuresRemaining.get(path) ?? 0
    if (remaining > 0) {
      failuresRemaining.set(path, remaining - 1)
      res.writeHead(503, {
        'Content-Type': 'text/html',
        Connection: 'keep-alive',
        'Keep-Alive': 'timeout=120',
      })
      res.end('x'.repeat(200_000))
      return
    }

    if (serveBrokenHome && path === '/') {
      res.writeHead(200, {
        'Content-Type': 'text/html',
        Connection: 'keep-alive',
        'Keep-Alive': 'timeout=120',
      })
      res.end('<!doctype html><html><body>nothing this script looks for</body></html>')
      return
    }

    const route = ROUTES[path]

    // Anything unlisted is a real 404 — which is what the script's
    // deliberately-nonexistent probe expects, and what a forgotten fixture
    // entry would look like (the script retries a 404 for up to 3 minutes, so
    // a gap here surfaces as this test's own timeout rather than as a pass).
    if (!route) {
      res.writeHead(404, { 'Content-Type': 'text/html', Connection: 'keep-alive' })
      res.end('<!doctype html><html><body>Not found</body></html>')
      return
    }

    res.writeHead(200, {
      'Content-Type': route.type,
      Connection: 'keep-alive',
      'Keep-Alive': 'timeout=120',
    })
    res.end(route.body)
  })

  // The default is 5 seconds, which closes the lingering socket for us and
  // hides the bug entirely. See the header.
  server.keepAliveTimeout = 120_000
  server.headersTimeout = 125_000

  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)))
}

type Outcome = {
  code: number | null
  signal: NodeJS.Signals | null
  timedOut: boolean
  elapsedMs: number
  stdout: string
  stderr: string
}

function runSmokeCheck(baseUrl: string): Promise<Outcome> {
  return new Promise((resolve) => {
    const started = Date.now()
    // Piped, not ignored: a pipe is what a CI runner gives this process, and
    // it is the reason exiting without flushing truncates output. Reading
    // them here also lets the stderr test below assert on the failure
    // summary.
    const child = spawn('node', [SCRIPT, baseUrl], { stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => (stdout += chunk))
    child.stderr.on('data', (chunk) => (stderr += chunk))

    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      resolve({
        code: null,
        signal: 'SIGKILL',
        timedOut: true,
        elapsedMs: Date.now() - started,
        stdout,
        stderr,
      })
    }, EXIT_BUDGET_MS)

    child.on('close', (code, signal) => {
      clearTimeout(timer)
      resolve({ code, signal, timedOut: false, elapsedMs: Date.now() - started, stdout, stderr })
    })
  })
}

describe('smoke-check process exit', () => {
  let server: Server
  let baseUrl: string

  beforeAll(async () => {
    server = await startKeepAliveServer()
    const { port } = server.address() as AddressInfo
    baseUrl = `http://127.0.0.1:${port}`
  })

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })

  it(
    'exits on its own after a fully passing run against a keep-alive server',
    async () => {
      const outcome = await runSmokeCheck(baseUrl)

      // The assertion that matters. `timedOut` means this harness had to kill
      // it — exactly what the CI runner did, five minutes after every check
      // had already passed.
      expect(outcome.timedOut).toBe(false)
      expect(outcome.signal).toBeNull()

      // Every check must have passed, because the all-pass path is the ONLY
      // one that ever hung. A non-zero code here means the fixture has
      // drifted from what smoke-check.mjs asserts, and the assertions above
      // have quietly stopped covering the bug.
      expect(outcome.code).toBe(0)

      // PROMPTLY, not merely eventually. Against this fixture the numbers are
      // stable and far apart -- measured over three runs each:
      //
      //   with the fix     195ms  217ms  188ms
      //   without it      8231ms 8257ms 8255ms
      //
      // so 3s leaves ~15x headroom above the good case and still sits well
      // under the bad one. Note the unfixed script does exit here, after
      // ~8.25s: the five-minute CI hang is the same unread-body mechanism
      // against a server advertising a far longer keep-alive. Asserting only
      // "it terminated" would therefore pass on the broken code, which is
      // exactly what an earlier draft of this test did.
      expect(outcome.elapsedMs).toBeLessThan(3_000)
    },
    EXIT_BUDGET_MS + 15_000
  )

  // Retrying must not add time beyond the delay it asks for. The script
  // waits RETRY_DELAY_MS (5s) between attempts, so one forced 503 puts the
  // floor at ~5s; measured, the whole run takes ~5.17s.
  //
  // WHAT THIS DOES *NOT* PROVE. The retry branch also releases the body of
  // the response it discards, and this test cannot see that: measured over
  // two runs each, with the release 5169/5177ms and without it 5192/5167ms —
  // no difference. A later request on the same connection pool appears to
  // clean the abandoned socket up, so only the bodies left unread at the
  // very END of the run (the icons, the favicon) ever held the process open.
  // The release on the retry path is defence in depth against a case this
  // fixture does not produce, not a measured fix, and it is described that
  // way rather than counted as covered.
  it(
    'does not add time beyond the retry delay it asks for',
    async () => {
      failuresRemaining.set('/android-chrome-512x512.png', 1)

      const outcome = await runSmokeCheck(baseUrl)

      expect(outcome.timedOut).toBe(false)
      expect(outcome.code).toBe(0)
      expect(outcome.elapsedMs).toBeLessThan(8_000)
    },
    EXIT_BUDGET_MS + 15_000
  )

  // The per-check lines go to stdout; `Failures:` and the crash stack go to
  // stderr, and exiting after flushing only stdout can truncate the one
  // thing a red run is read for.
  //
  // WHAT THIS DOES *NOT* PROVE, again stated rather than implied: waiting
  // for stderr specifically. This failure summary is ~1KB, comfortably
  // inside a pipe's buffer, so it survives either way — flushing stdout only
  // passes this test too. It is asserted because the summary reaching stderr
  // AT ALL is worth pinning, and the two-stream wait is correctness that
  // shows up at output sizes this fixture does not reach.
  it(
    'writes the failure summary to stderr and exits non-zero',
    async () => {
      serveBrokenHome = true
      const outcome = await runSmokeCheck(baseUrl).finally(() => {
        serveBrokenHome = false
      })

      expect(outcome.timedOut).toBe(false)
      expect(outcome.code).toBe(1)
      expect(outcome.stderr).toContain('Failures:')
      // Not merely the heading: the list under it has to survive too.
      expect(outcome.stderr).toMatch(/\n {2}- /)
    },
    EXIT_BUDGET_MS + 15_000
  )
})
