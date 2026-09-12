import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * The GitHub Pages project path this site is published under, e.g.
 * `/FFC-EX-example.org`. It appears in public/security.txt (which advertises
 * both the apex and the project-path URLs, because the site is reachable at
 * both before a domain cutover) and in scripts/check-drift.mjs, which verifies
 * that advertisement.
 *
 * Read from the script rather than duplicated here. Two copies of a value that
 * changes on every fork is exactly how the rebrand-vs-test contradiction got
 * into this suite in the first place: a rebrand updates one of them, and the
 * other turns red for a site that is perfectly correct.
 */
export function githubPagesProjectPath(repoRoot: string = process.cwd()): string {
  const source = readFileSync(join(repoRoot, 'scripts/check-drift.mjs'), 'utf8')
  const match = source.match(/const GITHUB_PAGES_PROJECT_PATH\s*=\s*'([^']+)'/)

  // Fail loudly rather than falling back to a default. If the constant is
  // renamed or reformatted, a silent fallback would make every assertion below
  // pass against a path nothing actually publishes — a test that cannot fail.
  if (!match) {
    throw new Error(
      'Could not read GITHUB_PAGES_PROJECT_PATH from scripts/check-drift.mjs. ' +
        'If the constant was renamed, update __tests__/helpers/githubPagesProjectPath.ts to match.'
    )
  }

  return match[1]
}
