import type { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://substackru.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard/',
          '/auth/',
          '/api/',
        ],
      },
      {
        // Yandex bot — same rules, explicit entry for clarity
        userAgent: 'YandexBot',
        allow: '/',
        disallow: [
          '/dashboard/',
          '/auth/',
          '/api/',
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  }
}
