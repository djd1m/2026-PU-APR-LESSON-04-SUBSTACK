import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ArticleCard, type ArticleCardProps } from '@/components/article/article-card'
import { SubscribeForm } from '@/components/subscription/subscribe-form'

interface Publication {
  slug: string
  name: string
  description: string
  authorName: string
  avatarUrl?: string
  subscriberCount: number
  articles: Omit<ArticleCardProps, 'publicationSlug'>[]
}

async function getPublication(slug: string): Promise<Publication | null> {
  try {
    const apiUrl = process.env.API_URL ?? 'http://localhost:4000/api'
    const res = await fetch(`${apiUrl}/publications/${slug}`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    // Return mock data for development
    if (slug === 'demo') {
      return {
        slug: 'demo',
        name: 'Демо-публикация',
        description: 'Пример публикации на платформе SubStack RU. Здесь авторы делятся инсайтами, историями и экспертными знаниями.',
        authorName: 'Иван Иванов',
        subscriberCount: 1247,
        articles: [
          {
            title: 'Как я заработал первый миллион рублей на блоге',
            excerpt: 'История о том, как обычный автор смог монетизировать свой контент и достичь финансовой независимости.',
            date: '2026-04-20',
            slug: 'pervyi-million',
            isPaid: false,
            readTimeMinutes: 8,
          },
          {
            title: 'Монетизация экспертного контента: полное руководство',
            excerpt: 'Разбираем все инструменты и стратегии для превращения знаний в стабильный доход.',
            date: '2026-04-15',
            slug: 'monetizatsiya-kontenta',
            isPaid: true,
            readTimeMinutes: 15,
          },
        ],
      }
    }
    return null
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const publication = await getPublication(slug)

  if (!publication) {
    return { title: 'Публикация не найдена — SubStack RU' }
  }

  return {
    title: `${publication.name} — SubStack RU`,
    description: publication.description,
    openGraph: {
      title: publication.name,
      description: publication.description,
      type: 'website',
    },
  }
}

export default async function PublicationPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const publication = await getPublication(slug)

  if (!publication) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <Header />

      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
        {/* Publication header */}
        <header className="text-center mb-12 pb-12 border-b border-gray-800">
          {/* Author avatar placeholder */}
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-indigo-500/20 border-2 border-indigo-500/30 text-2xl font-bold text-indigo-300">
            {publication.authorName.charAt(0)}
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-gray-100 mb-3">
            {publication.name}
          </h1>
          <p className="text-gray-400 max-w-xl mx-auto mb-4">
            {publication.description}
          </p>
          <p className="text-sm text-gray-500">
            Автор:{' '}
            <span className="text-gray-300 font-medium">{publication.authorName}</span>
            {' · '}
            <span>{publication.subscriberCount.toLocaleString('ru-RU')} подписчиков</span>
          </p>
        </header>

        {/* Subscribe form */}
        <div className="mb-12">
          <SubscribeForm
            publicationSlug={slug}
            publicationName={publication.name}
          />
        </div>

        {/* Articles */}
        <section>
          <h2 className="text-xl font-semibold text-gray-100 mb-6">
            Статьи
          </h2>

          {publication.articles.length === 0 ? (
            <p className="text-gray-500 text-center py-10">
              Пока нет опубликованных статей
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {publication.articles.map((article) => (
                <ArticleCard
                  key={article.slug}
                  {...article}
                  publicationSlug={slug}
                  authorName={publication.authorName}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  )
}
