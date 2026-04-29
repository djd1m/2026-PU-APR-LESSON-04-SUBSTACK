import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3011'
const INTERNAL_API = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3010/api'

interface ArticleData {
  id: string
  title: string
  slug: string
  content_html: string | null
  content_markdown: string
  excerpt: string
  visibility: 'free' | 'paid'
  status: string
  published_at: string | null
  created_at: string
  cover_image_url: string | null
  seo_title: string | null
  seo_description: string | null
  paywalled?: boolean
  publication?: {
    name: string
    slug: string
    description: string
    paid_price_monthly: number
    author?: { name: string }
  }
}

async function getArticle(pubSlug: string, articleSlug: string): Promise<ArticleData | null> {
  try {
    const res = await fetch(
      `${INTERNAL_API}/publications/${pubSlug}/articles/${articleSlug}`,
      { next: { revalidate: 60 } }
    )
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; articleSlug: string }>
}): Promise<Metadata> {
  const { slug, articleSlug } = await params
  const article = await getArticle(slug, articleSlug)

  if (!article) {
    return { title: 'Статья не найдена — SubStack RU' }
  }

  const title = article.seo_title ?? article.title
  const description = article.seo_description ?? article.excerpt

  return {
    title: `${title} — SubStack RU`,
    description,
    alternates: { canonical: `${BASE_URL}/${slug}/${articleSlug}` },
    openGraph: {
      title,
      description,
      type: 'article',
      url: `${BASE_URL}/${slug}/${articleSlug}`,
      ...(article.published_at && { publishedTime: article.published_at }),
      ...(article.cover_image_url && { images: [{ url: article.cover_image_url }] }),
    },
  }
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string; articleSlug: string }>
}) {
  const { slug, articleSlug } = await params
  const article = await getArticle(slug, articleSlug)

  if (!article) {
    notFound()
  }

  const pubName = article.publication?.name ?? ''
  const content = article.content_html ?? article.content_markdown ?? ''
  const isPaywalled = article.paywalled === true

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <Header />

      <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">
        {/* Article header */}
        <header className="mb-8">
          {/* Publication link */}
          <a
            href={`/${slug}`}
            className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            &larr; {pubName || slug}
          </a>

          <h1 className="text-3xl sm:text-4xl font-bold text-gray-100 mt-4 mb-4 leading-tight">
            {article.title}
          </h1>

          <div className="flex items-center gap-3 text-sm text-gray-500">
            <time>{formatDate(article.published_at ?? article.created_at)}</time>
            {article.visibility === 'paid' && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-xs font-medium">
                Платная
              </span>
            )}
          </div>
        </header>

        {/* Article content */}
        {isPaywalled ? (
          <div>
            {/* Teaser */}
            {article.excerpt && (
              <div className="prose prose-invert max-w-none mb-8">
                <p className="text-lg text-gray-300">{article.excerpt}</p>
              </div>
            )}
            {/* Paywall */}
            <div className="rounded-2xl border border-gray-800 bg-gradient-to-b from-gray-900 to-gray-950 p-8 text-center">
              <div className="text-4xl mb-4">🔒</div>
              <h2 className="text-xl font-bold text-gray-100 mb-2">
                Эта статья доступна по подписке
              </h2>
              <p className="text-gray-400 mb-6">
                Оформите платную подписку, чтобы читать все материалы автора
              </p>
              {article.publication?.paid_price_monthly ? (
                <a
                  href={`/${slug}`}
                  className="inline-block px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-colors"
                >
                  Подписаться от {article.publication.paid_price_monthly / 100} руб/мес
                </a>
              ) : (
                <a
                  href={`/${slug}`}
                  className="inline-block px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-colors"
                >
                  Перейти к публикации
                </a>
              )}
            </div>
          </div>
        ) : (
          <article
            className="prose prose-invert prose-lg max-w-none
              prose-headings:text-gray-100 prose-p:text-gray-300
              prose-a:text-indigo-400 prose-strong:text-gray-100
              prose-code:text-indigo-300 prose-code:bg-gray-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
              prose-blockquote:border-indigo-500 prose-blockquote:text-gray-400
              prose-li:text-gray-300"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        )}

        {/* Footer CTA */}
        <div className="mt-12 pt-8 border-t border-gray-800">
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 text-center">
            <p className="text-gray-400 mb-4">
              Понравилась статья? Подпишитесь на {pubName || 'эту публикацию'}
            </p>
            <a
              href={`/${slug}`}
              className="inline-block px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-colors"
            >
              Подписаться
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
