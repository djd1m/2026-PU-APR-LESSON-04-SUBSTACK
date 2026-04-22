import type { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://substackru.com'
const API_URL = process.env.API_URL ?? 'http://localhost:4000/api'

interface SitemapPublication {
  slug: string
  updated_at: string
}

interface SitemapArticle {
  slug: string
  publication_slug: string
  published_at: string
  updated_at: string
}

interface SitemapData {
  publications: SitemapPublication[]
  articles: SitemapArticle[]
}

async function getSitemapData(): Promise<SitemapData> {
  try {
    const res = await fetch(`${API_URL}/sitemap`, {
      next: { revalidate: 3600 }, // Refresh every hour
    })

    if (res.ok) {
      return res.json() as Promise<SitemapData>
    }
  } catch {
    // Fallback: return minimal data if API is unavailable
  }

  return { publications: [], articles: [] }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { publications, articles } = await getSitemapData()

  const publicationEntries: MetadataRoute.Sitemap = publications.map((pub) => ({
    url: `${BASE_URL}/${pub.slug}`,
    lastModified: new Date(pub.updated_at),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  const articleEntries: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${BASE_URL}/${article.publication_slug}/${article.slug}`,
    lastModified: new Date(article.updated_at ?? article.published_at),
    changeFrequency: 'monthly',
    priority: 0.6,
  }))

  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    ...publicationEntries,
    ...articleEntries,
  ]
}
