import type { Metadata } from 'next'
import { siteConfig, siteUrl } from '@/lib/site.config'
import { siteMetadata } from '@/lib/siteMetadata'

export type PageMetadataInput = {
  /** Page title WITHOUT the site suffix -- the title template adds it. */
  title: string
  /** Page description. Also becomes og:description and twitter:description. */
  description: string
  /** Same-origin route path, e.g. '/privacy-policy'. */
  path: string
}

/**
 * Per-page metadata for a content route.
 *
 * WHY THIS EXISTS -- Next does NOT deep-merge `openGraph` and `twitter`.
 * A page that defines either one replaces the layout's object wholesale, and
 * a page that defines neither inherits the layout's *verbatim*. Both halves
 * of that are traps, and this template had the second: every page set its own
 * `title`, `description` and canonical, and every page still emitted the home
 * page's `og:url`, `og:title` and `og:description`. Measured on the export of
 * a fork (FFC-EX-neurospike.org#27) -- all eleven content pages plus the 404
 * advertised `og:url` as the site root, so a share of the privacy policy on
 * LinkedIn or Slack unfurled as the home page. Every site built from this
 * template has the same defect, because it is the template's.
 *
 * The canonical tag had already been fixed page by page (each one carries a
 * comment saying why), which is what made the gap easy to miss: the visible
 * half was right, so nothing looked broken.
 *
 * Spreading the layout's objects is deliberate -- it keeps `og:type`,
 * `og:site_name`, `og:image`, `twitter:card` and `twitter:site` correct
 * without restating them, so a field added to siteMetadata reaches every
 * page. Spelling the shared fields out here instead would put the social
 * card one forgotten page away from being missing again, which is the shape
 * of the bug this helper exists to close.
 */
export function pageMetadata({ title, description, path }: PageMetadataInput): Metadata {
  const socialTitle = `${title} | ${siteConfig.name}`
  const url = siteUrl(path)

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      ...siteMetadata.openGraph,
      title: socialTitle,
      description,
      url,
    },
    twitter: {
      ...siteMetadata.twitter,
      title: socialTitle,
      description,
    },
  }
}
