import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Paywall } from '@/components/article/paywall'
import { SubscribeForm } from '@/components/subscription/subscribe-form'

interface Article {
  id: string
  title: string
  content: string
  excerpt: string
  isPaid: boolean
  publishedAt: string
  readTimeMinutes: number
  authorName: string
  publicationName: string
  publicationSlug: string
  priceMonthly?: number
  priceYearly?: number
}

function isUserSubscribed(articleSlug: string): boolean {
  // In real implementation: check subscription token server-side
  // Here: placeholder logic
  void articleSlug
  return false
}

async function getArticle(
  publicationSlug: string,
  articleSlug: string
): Promise<Article | null> {
  try {
    const apiUrl = process.env.API_URL ?? 'http://localhost:4000/api'
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value

    const res = await fetch(
      `${apiUrl}/publications/${publicationSlug}/articles/${articleSlug}`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        next: { revalidate: 300 },
      }
    )

    if (!res.ok) return null
    return res.json()
  } catch {
    // Return mock data for development
    if (articleSlug === 'pervyi-million') {
      return {
        id: '1',
        title: 'Как я заработал первый миллион рублей на блоге',
        content: `
          <h2>Начало пути</h2>
          <p>Всё началось три года назад, когда я решил написать первую статью о своём опыте в маркетинге. Я не ожидал никакого результата — просто хотел систематизировать свои знания.</p>
          <p>Первые шесть месяцев я писал в стол. Буквально. Три читателя: мама, коллега и случайный человек из интернета.</p>
          <h2>Первые подписчики</h2>
          <p>Переломным моментом стала статья о реальных кейсах. Люди хотят видеть конкретику, а не абстрактные советы. Тогда я понял главное правило: пиши о том, что сам прожил.</p>
          <p>За следующие три месяца база выросла с 3 до 500 подписчиков. Медленно, но это были лояльные читатели, которые открывали каждое письмо.</p>
        `,
        excerpt: 'История о том, как обычный автор смог монетизировать свой контент.',
        isPaid: false,
        publishedAt: '2026-04-20T10:00:00Z',
        readTimeMinutes: 8,
        authorName: 'Иван Иванов',
        publicationName: 'Демо-публикация',
        publicationSlug: 'demo',
      }
    }
    if (articleSlug === 'monetizatsiya-kontenta') {
      return {
        id: '2',
        title: 'Монетизация экспертного контента: полное руководство',
        content: '<p>Полное содержание доступно только платным подписчикам.</p>',
        excerpt: 'Разбираем все инструменты и стратегии для превращения знаний в стабильный доход.',
        isPaid: true,
        publishedAt: '2026-04-15T10:00:00Z',
        readTimeMinutes: 15,
        authorName: 'Иван Иванов',
        publicationName: 'Демо-публикация',
        publicationSlug: 'demo',
        priceMonthly: 490,
        priceYearly: 4900,
      }
    }
    return null
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://substackru.com'

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

  const canonicalUrl = `${BASE_URL}/${slug}/${articleSlug}`

  return {
    title: `${article.title} — ${article.publicationName}`,
    description: article.excerpt,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: 'article',
      publishedTime: article.publishedAt,
      authors: [article.authorName],
      url: canonicalUrl,
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

  const userSubscribed = isUserSubscribed(articleSlug)
  const showPaywall = article.isPaid && !userSubscribed
  // Show truncated content (first ~300 chars) before paywall
  const previewContent = showPaywall
    ? article.content.slice(0, 600) + '...'
    : article.content

  const canonicalUrl = `${BASE_URL}/${slug}/${articleSlug}`

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt,
    datePublished: article.publishedAt,
    dateModified: article.publishedAt,
    author: {
      '@type': 'Person',
      name: article.authorName,
    },
    publisher: {
      '@type': 'Organization',
      name: article.publicationName,
      url: `${BASE_URL}/${slug}`,
    },
    url: canonicalUrl,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl,
    },
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />

      <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">
        {/* Back link */}
        <a
          href={`/${slug}`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300 transition-colors mb-8"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          {article.publicationName}
        </a>

        {/* Article header */}
        <header className="mb-10">
          {/* Badges */}
          <div className="flex items-center gap-2 mb-4">
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                article.isPaid
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              }`}
            >
              {article.isPaid ? 'Платная статья' : 'Бесплатная статья'}
            </span>
            <span className="text-xs text-gray-500">
              {article.readTimeMinutes} мин чтения
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-gray-100 mb-5 leading-tight">
            {article.title}
          </h1>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-300 text-sm font-semibold">
                {article.authorName.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-300">{article.authorName}</p>
                <p className="text-xs text-gray-500">{formatDate(article.publishedAt)}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Article content */}
        <div className="relative">
          <div
            className="prose-content"
            dangerouslySetInnerHTML={{ __html: previewContent }}
          />

          {/* Paywall */}
          {showPaywall && (
            <div className="mt-6">
              <Paywall
                publicationName={article.publicationName}
                publicationSlug={article.publicationSlug}
                priceMonthly={article.priceMonthly ?? 490}
                priceYearly={article.priceYearly}
              />
            </div>
          )}
        </div>

        {/* Subscribe form (for free articles) */}
        {!article.isPaid && (
          <div className="mt-16 pt-8 border-t border-gray-800">
            <SubscribeForm
              publicationSlug={slug}
              publicationName={article.publicationName}
            />
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
