'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { clsx } from 'clsx'

interface Article {
  id: string
  title: string
  excerpt: string
  status: 'draft' | 'published' | 'scheduled'
  visibility: 'free' | 'paid'
  published_at: string | null
  created_at: string
}

interface Publication {
  id: string
  name: string
  slug: string
}

interface ArticlesResponse {
  items: Article[]
  total: number
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Черновик',
  published: 'Опубликована',
  scheduled: 'Запланирована',
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-700 text-gray-300',
  published: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  scheduled: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'draft' | 'published' | 'scheduled'>('all')

  useEffect(() => {
    async function loadArticles() {
      try {
        // Get author's publications first
        const pubs = await api.get<Publication[]>('/publications/my')
        if (pubs.length === 0) {
          setArticles([])
          return
        }

        // Load articles from all publications
        const allArticles: Article[] = []
        for (const pub of pubs) {
          try {
            // Use slug to get articles (the endpoint expects slug, not id)
            const resp = await api.get<ArticlesResponse | Article[]>(
              `/publications/${pub.slug}/articles?limit=100`
            )
            // API may return {items, total} or just array
            const items = Array.isArray(resp) ? resp : (resp.items ?? [])
            allArticles.push(...items)
          } catch {
            // Skip publications with errors
          }
        }

        // Sort by created_at descending
        allArticles.sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        setArticles(allArticles)
      } catch {
        setArticles([])
      } finally {
        setLoading(false)
      }
    }
    loadArticles()
  }, [])

  const filtered = filter === 'all' ? articles : articles.filter(a => a.status === filter)

  const counts = {
    all: articles.length,
    published: articles.filter(a => a.status === 'published').length,
    draft: articles.filter(a => a.status === 'draft').length,
    scheduled: articles.filter(a => a.status === 'scheduled').length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin h-8 w-8 rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Статьи</h1>
          <p className="text-sm text-gray-500 mt-1">
            {articles.length > 0
              ? `Всего: ${articles.length} (${counts.published} опубликовано, ${counts.draft} черновиков)`
              : 'Управляйте своими публикациями'}
          </p>
        </div>
        <Link href="/dashboard/editor">
          <Button variant="primary">
            <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Новая статья
          </Button>
        </Link>
      </div>

      {/* Filter tabs */}
      {articles.length > 0 && (
        <div className="flex gap-1 p-1 rounded-lg bg-gray-900 border border-gray-800 w-fit mb-6">
          {([
            ['all', 'Все'],
            ['published', 'Опубликованные'],
            ['draft', 'Черновики'],
            ['scheduled', 'Запланированные'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={clsx(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                filter === key
                  ? 'bg-indigo-500 text-white'
                  : 'text-gray-400 hover:text-gray-200'
              )}
            >
              {label}{' '}
              <span className="ml-1 text-xs opacity-70">{counts[key]}</span>
            </button>
          ))}
        </div>
      )}

      {/* Articles list */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-gray-500 mb-4">
              {articles.length === 0 ? 'Статей пока нет' : 'Нет статей с таким статусом'}
            </p>
            <Link href="/dashboard/editor">
              <Button variant="primary" size="sm">Написать первую статью</Button>
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Статья</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Статус</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Дата</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filtered.map((article) => (
                <tr key={article.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-5 py-4">
                    <p className="text-sm font-medium text-gray-200 line-clamp-1">
                      {article.title}
                    </p>
                    {article.excerpt && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                        {article.excerpt}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2 sm:hidden">
                      <span className={clsx('inline-flex px-2 py-0.5 rounded-full text-xs font-medium', STATUS_STYLES[article.status] ?? STATUS_STYLES.draft)}>
                        {STATUS_LABELS[article.status] ?? article.status}
                      </span>
                      <span className={clsx('inline-flex px-2 py-0.5 rounded-full text-xs font-medium', article.visibility === 'paid' ? 'bg-amber-500/10 text-amber-400' : 'bg-gray-700 text-gray-400')}>
                        {article.visibility === 'paid' ? 'Платная' : 'Бесплатная'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 hidden sm:table-cell">
                    <div className="flex flex-col gap-1.5">
                      <span className={clsx('inline-flex w-fit px-2 py-0.5 rounded-full text-xs font-medium', STATUS_STYLES[article.status] ?? STATUS_STYLES.draft)}>
                        {STATUS_LABELS[article.status] ?? article.status}
                      </span>
                      <span className={clsx('inline-flex w-fit px-2 py-0.5 rounded-full text-xs font-medium', article.visibility === 'paid' ? 'bg-amber-500/10 text-amber-400' : 'bg-gray-700 text-gray-400')}>
                        {article.visibility === 'paid' ? 'Платная' : 'Бесплатная'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 hidden md:table-cell">
                    <span className="text-xs text-gray-500">
                      {formatDate(article.published_at ?? article.created_at)}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <Link
                      href={`/dashboard/editor?id=${article.id}`}
                      className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      Редактировать
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
