import type { Metadata } from 'next'
import { assetPath } from '@/lib/assetPath'
import { cardDescription, siteConfig, siteUrl, twitterSite } from '@/lib/site.config'

const defaultTitle = `${siteConfig.name} | ${siteConfig.tagline}`

/**
 * The social card. Regenerate with `pnpm run og:card` after any change to
 * name, tagline, shortDescription or themeColor.
 *
 * This used to be `/web-app-manifest-512x512.png` -- a 512x512 square
 * advertised under `twitter:card: summary_large_image`, which no platform
 * renders the way it reads: X and LinkedIn either letterbox it or silently
 * demote the card to the small layout. 1200x630 is the size Facebook, X and
 * LinkedIn all document.
 *
 * Referenced through assetPath() rather than Next's `opengraph-image` file
 * convention, which does NOT apply `basePath` -- see the header comment in
 * scripts/generate-og-card.mjs for the measurement.
 */
const socialCard = {
  url: assetPath('/og-card.png'),
  width: 1200,
  height: 630,
  alt: `${siteConfig.name} — ${siteConfig.tagline}`,
}

export const siteMetadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: defaultTitle,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [...siteConfig.keywords],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
  alternates: {
    canonical: siteUrl('/'),
  },
  openGraph: {
    type: 'website',
    url: siteUrl('/'),
    siteName: siteConfig.name,
    title: defaultTitle,
    description: cardDescription(),
    images: [socialCard],
  },
  twitter: {
    card: 'summary_large_image',
    site: twitterSite(),
    title: defaultTitle,
    description: cardDescription(),
    images: [socialCard.url],
  },
  icons: {
    icon: [
      { url: assetPath('/favicon.ico'), sizes: '32x32' },
      { url: assetPath('/icon.png'), type: 'image/png', sizes: '32x32' },
    ],
    apple: [{ url: assetPath('/apple-icon.png'), sizes: '180x180', type: 'image/png' }],
  },
  manifest: assetPath('/manifest.webmanifest'),
}
