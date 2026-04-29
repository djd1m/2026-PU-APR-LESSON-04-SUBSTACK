import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { SubscribeForm } from '@/components/subscription/subscribe-form'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3011'
// SSR fetches go to internal API (server-to-server)
const INTERNAL_API = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3010/api'

interface PublicationData {
  id: string
  name: string
  slug: string
  description: string
  avatar_url: string | null
  author_id: string
  paid_enabled: boolean
  paid_price_monthly: number
  _count?: { subscriptions: number }
  author?: { name: string }
}

interface ArticleData {
  id: string
  title: string
  slug: string
  excerpt: string
  visibility: 'free' | 'paid'
  status: string
  published_at: string | null
  created_at: string
}

async function getPublication(slug: string): Promise<PublicationData | null> {
  try {
    const res = await fetch(`${INTERNAL_API}/publications/${slug}`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

async function getArticles(slug: string): Promise<ArticleData[]> {
  try {
    const res = await fetch(`${INTERNAL_API}/publications/${slug}/articles?limit=50`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.items ?? data ?? []
  } catch {
    return []
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const pub = await getPublication(slug)

  if (!pub) {
    return { title: 'Публикация не найдена — SubStack RU' }
  }

  return {
    title: `${pub.name} — SubStack RU`,
    description: pub.description,
    alternates: { canonical: `${BASE_URL}/${slug}` },
    openGraph: {
      title: pub.name,
      description: pub.description,
      type: 'website',
      url: `${BASE_URL}/${slug}`,
    },
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default async function PublicationPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const [pub, articles] = await Promise.all([
    getPublication(slug),
    getArticles(slug),
  ])

  if (!pub) {
    notFound()
  }

  const subscriberCount = pub._count?.subscriptions ?? 0

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <Header />

      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
        {/* Publication header */}
        <header className="text-center mb-12 pb-12 border-b border-gray-800">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-indigo-500/20 border-2 border-indigo-500/30 text-2xl font-bold text-indigo-300">
            {pub.name.charAt(0)}
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-gray-100 mb-3">
            {pub.name}
          </h1>
          {pub.description && (
            <p className="text-gray-400 max-w-xl mx-auto mb-4">
              {pub.description}
            </p>
          )}
          <p className="text-sm text-gray-500">
            {subscriberCount > 0 && (
              <span>{subscriberCount.toLocaleString('ru-RU')} подписчиков</span>
            )}
            {pub.paid_enabled && (
              <span> · Подписка от {pub.paid_price_monthly / 100} руб/мес</span>
            )}
          </p>
        </header>

        {/* Subscribe form */}
        <div className="mb-12">
          <SubscribeForm publicationSlug={slug} publicationName={pub.name} />
        </div>

        {/* Articles */}
        <section>
          <h2 className="text-xl font-semibold text-gray-100 mb-6">Статьи</h2>

          {articles.length === 0 ? (
            <p className="text-gray-500 text-center py-10">
              Пока нет опубликованных статей
            </p>
          ) : (
            <div className="space-y-4">
              {articles.map((article) => (
                <a
                  key={article.id}
                  href={`/${slug}/${article.slug}`}
                  className="block rounded-xl border border-gray-800 bg-gray-900 p-6 hover:border-gray-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-100 mb-1 line-clamp-2">
                        {article.title}
                      </h3>
                      {article.excerpt && (
                        <p className="text-sm text-gray-400 line-clamp-2 mb-3">
                          {article.excerpt}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>{formatDate(article.published_at ?? article.created_at)}</span>
                        {article.visibility === 'paid' && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-medium">
                            Платная
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  )
}
