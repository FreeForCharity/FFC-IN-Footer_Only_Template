import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, jest, test } from '@jest/globals'

import manifest from '@/app/manifest'
import { siteConfig } from '@/lib/site.config'

describe('manifest and Lighthouse parity', () => {
  const originalBasePath = process.env.NEXT_PUBLIC_BASE_PATH

  afterEach(() => {
    if (originalBasePath === undefined) {
      delete process.env.NEXT_PUBLIC_BASE_PATH
    } else {
      process.env.NEXT_PUBLIC_BASE_PATH = originalBasePath
    }
  })

  test('generates the app manifest from siteConfig', () => {
    delete process.env.NEXT_PUBLIC_BASE_PATH

    expect(manifest()).toEqual(
      expect.objectContaining({
        name: siteConfig.name,
        short_name: siteConfig.name,
        description: siteConfig.shortDescription,
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: siteConfig.themeColor,
        theme_color: siteConfig.themeColor,
        icons: [
          {
            src: '/android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      })
    )

    const { siteMetadata } = require('@/lib/siteMetadata')
    expect(siteMetadata.manifest).toBe('/manifest.webmanifest')
    expect(existsSync(join(process.cwd(), 'public/site.webmanifest'))).toBe(false)
  })

  test('prefixes manifest paths with NEXT_PUBLIC_BASE_PATH for GitHub Pages deploys', () => {
    process.env.NEXT_PUBLIC_BASE_PATH = '/FFC-IN-Footer_Only_Template'

    const generated = manifest()

    expect(generated.start_url).toBe('/FFC-IN-Footer_Only_Template/')
    expect(generated.scope).toBe('/FFC-IN-Footer_Only_Template/')
    expect(generated.icons?.map((icon) => icon.src)).toEqual([
      '/FFC-IN-Footer_Only_Template/android-chrome-192x192.png',
      '/FFC-IN-Footer_Only_Template/android-chrome-512x512.png',
    ])

    jest.resetModules()
    const { siteMetadata } = require('@/lib/siteMetadata')
    expect(siteMetadata.manifest).toBe('/FFC-IN-Footer_Only_Template/manifest.webmanifest')
  })

  test('Lighthouse workflow derives basePath instead of hard-coding this repository', () => {
    const workflow = readFileSync(join(process.cwd(), '.github/workflows/lighthouse.yml'), 'utf8')

    expect(workflow).toContain('id: basepath')
    expect(workflow).toContain('public/CNAME')
    expect(workflow).toContain('value=/${GITHUB_REPOSITORY#*/}')
    expect(workflow).toContain('NEXT_PUBLIC_BASE_PATH: ${{ steps.basepath.outputs.value }}')
    expect(workflow).toContain('Prepare Lighthouse URLs')
    expect(workflow).toContain('rm -rf .lighthouseci-dist')
    expect(workflow).toContain('.ci.collect.staticDistDir = "./.lighthouseci-dist"')
    expect(workflow).toContain('jq --arg base_path')
    expect(workflow).toContain('http://localhost" + $base_path')
    expect(workflow).not.toContain('NEXT_PUBLIC_BASE_PATH: /FFC-IN-Footer_Only_Template')
  })

  test('Lighthouse audits the same parity pages as the full template', () => {
    const lighthouserc = JSON.parse(readFileSync(join(process.cwd(), 'lighthouserc.json'), 'utf8'))

    expect(lighthouserc.ci.collect.url).toEqual([
      'http://localhost/index.html',
      'http://localhost/cookie-policy/',
      'http://localhost/privacy-policy/',
      'http://localhost/terms-of-service/',
    ])
  })
})
