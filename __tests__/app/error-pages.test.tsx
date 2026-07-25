import React from 'react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { render, screen, fireEvent } from '@testing-library/react'

import NotFound, { metadata as notFoundMeta } from '../../src/app/not-found'
import ErrorBoundaryPage from '../../src/app/error'
import { siteConfig } from '../../src/lib/site.config'

const root = process.cwd()

function readSource(path: string): string {
  return readFileSync(join(root, path), 'utf8')
}

/** Source with `//` comment lines removed, so prose about a rule can't satisfy it. */
function readCode(path: string): string {
  return readSource(path)
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n')
}

describe('not-found page (app/not-found.tsx)', () => {
  it('exports a title and description', () => {
    expect(typeof notFoundMeta.title).toBe('string')
    expect((notFoundMeta.title as string).length).toBeGreaterThan(0)
    expect(typeof notFoundMeta.description).toBe('string')
    expect(notFoundMeta.description).toContain(siteConfig.name)
  })

  it('tells crawlers not to index or follow the 404 page', () => {
    const robots = notFoundMeta.robots as { index: boolean; follow: boolean }

    expect(robots.index).toBe(false)
    expect(robots.follow).toBe(false)
  })

  it('owns exactly one main landmark with the skip target id', () => {
    render(<NotFound />)
    const mains = screen.getAllByRole('main')

    expect(mains).toHaveLength(1)
    expect(mains[0]).toHaveAttribute('id', 'main-content')
  })

  it('renders a single level-1 heading', () => {
    render(<NotFound />)

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it('identifies itself as a 404', () => {
    render(<NotFound />)

    expect(screen.getByText(/error 404/i)).toBeInTheDocument()
  })

  it('offers a route back to the home page', () => {
    render(<NotFound />)

    expect(screen.getByRole('link', { name: /home page/i })).toHaveAttribute('href', '/')
  })

  it('links to the vulnerability disclosure policy from siteConfig', () => {
    render(<NotFound />)

    expect(screen.getByRole('link', { name: /vulnerability disclosure policy/i })).toHaveAttribute(
      'href',
      siteConfig.vulnerabilityDisclosurePath
    )
  })

  it('exposes the configured contact email as a mailto link', () => {
    render(<NotFound />)

    expect(screen.getByRole('link', { name: siteConfig.contactEmail })).toHaveAttribute(
      'href',
      `mailto:${siteConfig.contactEmail}`
    )
  })
})

describe('error boundary page (app/error.tsx)', () => {
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    // The boundary logs the raw error outside production; keep Jest output clean.
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('is a client component', () => {
    // Next.js requires error boundaries to run on the client; without the
    // directive the build fails on the useEffect/onClick hooks below.
    expect(readSource('src/app/error.tsx').trimStart().startsWith("'use client'")).toBe(true)
  })

  it('owns exactly one main landmark with the skip target id', () => {
    render(<ErrorBoundaryPage error={new Error('boom')} reset={() => {}} />)
    const mains = screen.getAllByRole('main')

    expect(mains).toHaveLength(1)
    expect(mains[0]).toHaveAttribute('id', 'main-content')
  })

  it('renders a single level-1 heading', () => {
    render(<ErrorBoundaryPage error={new Error('boom')} reset={() => {}} />)

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it('calls reset when the visitor retries', () => {
    const reset = jest.fn()
    render(<ErrorBoundaryPage error={new Error('boom')} reset={reset} />)

    fireEvent.click(screen.getByRole('button', { name: /try again/i }))

    expect(reset).toHaveBeenCalledTimes(1)
  })

  it('offers a route back to the home page', () => {
    render(<ErrorBoundaryPage error={new Error('boom')} reset={() => {}} />)

    expect(screen.getByRole('link', { name: /home page/i })).toHaveAttribute('href', '/')
  })

  it('links to the vulnerability disclosure policy from siteConfig', () => {
    render(<ErrorBoundaryPage error={new Error('boom')} reset={() => {}} />)

    expect(screen.getByRole('link', { name: /vulnerability disclosure policy/i })).toHaveAttribute(
      'href',
      siteConfig.vulnerabilityDisclosurePath
    )
  })

  it('shows the opaque digest when Next.js supplies one', () => {
    const error = Object.assign(new Error('boom'), { digest: '1234567890' })
    render(<ErrorBoundaryPage error={error} reset={() => {}} />)

    expect(screen.getByText(/reference id/i)).toHaveTextContent('1234567890')
  })

  it('omits the reference ID entirely when there is no digest', () => {
    render(<ErrorBoundaryPage error={new Error('boom')} reset={() => {}} />)

    expect(screen.queryByText(/reference id/i)).not.toBeInTheDocument()
  })
})

describe('error boundary does not leak internals to visitors', () => {
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('never renders the error message or stack trace', () => {
    const error = Object.assign(
      new Error('connection string postgres://user:hunter2@db.internal:5432'),
      { digest: 'abc123', stack: 'Error: secret-stack-frame\n    at leakyModule (secret.ts:1:1)' }
    )

    const { container } = render(<ErrorBoundaryPage error={error} reset={() => {}} />)

    expect(container.textContent).not.toContain('hunter2')
    expect(container.textContent).not.toContain('db.internal')
    expect(container.textContent).not.toContain('secret-stack-frame')
    expect(container.textContent).not.toContain('secret.ts')
  })

  it('reads neither error.message nor error.stack in its executable source', () => {
    // Guards the rule at the source level too: a future edit that rendered
    // `error.message` would still pass the render assertions above if someone
    // also changed the fixture, but this check fails immediately.
    const code = readCode('src/app/error.tsx')

    expect(code).not.toMatch(/error\.message/)
    expect(code).not.toMatch(/error\.stack/)
  })

  it('logs to the console only outside production', () => {
    expect(readCode('src/app/error.tsx')).toContain("process.env.NODE_ENV !== 'production'")
  })
})

describe('branded error routes are wired into the app directory', () => {
  it('keeps both boundary files where the App Router expects them', () => {
    expect(() => readSource('src/app/not-found.tsx')).not.toThrow()
    expect(() => readSource('src/app/error.tsx')).not.toThrow()
  })

  it('leaves the 404 route out of the sitemap', async () => {
    const { routes } = await import('../../src/app/sitemap')

    expect(routes.some((entry) => entry.path.includes('404'))).toBe(false)
    expect(routes.some((entry) => entry.path.includes('not-found'))).toBe(false)
  })
})
