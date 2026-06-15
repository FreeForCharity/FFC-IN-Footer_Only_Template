import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/site.config'

export const dynamic = 'force-static'

type SitemapEntry = {
  path: string
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']
  priority: number
}

export const routes: readonly SitemapEntry[] = [
  { path: '/', changeFrequency: 'weekly', priority: 1.0 },
  { path: '/privacy-policy', changeFrequency: 'yearly', priority: 0.2 },
  { path: '/cookie-policy', changeFrequency: 'yearly', priority: 0.2 },
  { path: '/terms-of-service', changeFrequency: 'yearly', priority: 0.2 },
  { path: '/donation-policy', changeFrequency: 'yearly', priority: 0.2 },
  { path: '/free-for-charity-donation-policy', changeFrequency: 'yearly', priority: 0.2 },
  { path: '/vulnerability-disclosure-policy', changeFrequency: 'yearly', priority: 0.2 },
  { path: '/security-acknowledgements', changeFrequency: 'monthly', priority: 0.2 },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return routes.map((entry) => ({
    url: siteUrl(entry.path),
    lastModified: now,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }))
}
