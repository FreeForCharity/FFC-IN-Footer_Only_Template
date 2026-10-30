import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Guards the Playwright version pinned in .github/workflows/post-deploy-smoke.yml
 * against the version pnpm-lock.yaml actually resolves.
 *
 * WHY THIS TEST EXISTS
 * --------------------
 * The smoke job installs Playwright into /tmp/pw by literal version, rather
 * than from this repo's lockfile, and its own comment states the invariant:
 * the pin "matches the version this repo's lockfile resolves, so the smoke
 * run drives the same browser automation the repo's own tests do".
 *
 * Nothing enforced that. A dependency bump rewrites pnpm-lock.yaml and leaves
 * the workflow's literal untouched, so the invariant decays silently -- and
 * the decay is harmless right up until the stale version stops working on the
 * runner image, at which point it is a red `main` whose cause is six weeks
 * upstream of the commit that surfaced it.
 *
 * Observed 2026-10-30: the pin was 1.57.0 while the lockfile resolved 1.63.0.
 * The drift had been invisible for as long as 1.57.0 kept installing. Then
 * GitHub migrated `ubuntu-latest` to Ubuntu 26.04 (rollout began 2026-10-19)
 * and Playwright 1.57.0, which has no dependency recipe for that image, began
 * failing at `install --with-deps chromium` with "Cannot install dependencies
 * for ubuntu26.04-x64 with Playwright 1.57.0!". The `smoke` check failed on
 * `main` every day from 2026-10-23 to 2026-10-30 -- eight consecutive days --
 * and the visual, compliance and screenshot assertions behind that step never
 * ran at all. On the same runner image that morning, 1.61.1 (FFC-EX-canary)
 * and 1.62.1 (FFC-IN-FFC_Single_Page_Template) both installed cleanly, so the
 * version really was the variable.
 *
 * Both halves of the assertion are DERIVED. Hard-coding "1.63.0" here would
 * reproduce the original defect one file over: the next bump would move the
 * lockfile and the workflow and leave this test asserting a version neither
 * of them uses. Comparing the two sources to each other is what keeps the
 * guard honest across bumps nobody has made yet.
 *
 * Parsed with regexes rather than a YAML library, matching
 * __tests__/workflows/deploy-notify.test.ts: this repo ships no YAML parser,
 * and pnpm-lock.yaml's package keys are a fixed, machine-written shape.
 */
const WORKFLOW = join(process.cwd(), '.github', 'workflows', 'post-deploy-smoke.yml')
const LOCKFILE = join(process.cwd(), 'pnpm-lock.yaml')

/**
 * The version in `npm install ... playwright@<version>` in the smoke job.
 *
 * Returns every match rather than the first, so a second install site added
 * later cannot drift unnoticed behind a passing assertion on the first one.
 */
function workflowPins(): string[] {
  const source = readFileSync(WORKFLOW, 'utf8')
  const pins = [...source.matchAll(/\bplaywright@(\d+\.\d+\.\d+)\b/g)].map((match) => match[1])

  // An empty derived set is how a derived test stops testing anything: a
  // reformatted or renamed install step would make every comparison below
  // vacuously true. Fail here instead, where the cause is readable.
  expect(pins.length).toBeGreaterThan(0)
  return pins
}

/**
 * The `playwright` version pnpm-lock.yaml resolves.
 *
 * Keyed on the top-level `  playwright@<version>:` package entries rather
 * than `@playwright/test`, because the workflow installs the bare
 * `playwright` package and that is the tree whose browser revision has to
 * agree with the one the repo's own tests drive.
 */
function lockedVersions(): string[] {
  const source = readFileSync(LOCKFILE, 'utf8')
  const versions = [...source.matchAll(/^ {2}playwright@(\d+\.\d+\.\d+):/gm)].map((m) => m[1])

  expect(versions.length).toBeGreaterThan(0)
  return [...new Set(versions)]
}

describe('post-deploy-smoke.yml Playwright pin', () => {
  it('resolves exactly one playwright version in the lockfile', () => {
    // Two resolutions would make "the version the lockfile resolves"
    // ambiguous, and the comparison below arbitrary. Better to fail and have
    // a person decide which one the smoke run should drive.
    expect(lockedVersions()).toHaveLength(1)
  })

  it('pins every install site to the version the lockfile resolves', () => {
    const [locked] = lockedVersions()

    for (const pin of workflowPins()) {
      expect(pin).toBe(locked)
    }
  })

  // The Ubuntu 26.04 floor, stated independently of the lockfile. Keeping the
  // two in step is the general rule above; this pins the specific fact that
  // made the drift expensive, so a lockfile DOWNGRADE below the floor fails
  // here rather than quietly restoring a version that cannot install on the
  // current `ubuntu-latest`.
  it('stays at or above the first version that installs on Ubuntu 26.04', () => {
    const FLOOR = [1, 61, 1]
    const [locked] = lockedVersions()
    const parts = locked.split('.').map(Number)

    const atOrAbove =
      parts[0] > FLOOR[0] ||
      (parts[0] === FLOOR[0] &&
        (parts[1] > FLOOR[1] || (parts[1] === FLOOR[1] && parts[2] >= FLOOR[2])))

    expect(atOrAbove).toBe(true)
  })

  // `--with-deps` is the flag that makes the runner image matter at all: it
  // is what asks Playwright for an OS dependency recipe, and what failed on
  // Ubuntu 26.04. If it is ever dropped, the floor above stops being the
  // thing protecting this job and this test should stop implying it is.
  it('still installs OS dependencies, which is what makes the image matter', () => {
    const source = readFileSync(WORKFLOW, 'utf8')
    expect(source).toContain('playwright install --with-deps chromium')
  })
})
