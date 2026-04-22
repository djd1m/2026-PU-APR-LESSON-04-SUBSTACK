import Link from 'next/link'
import { clsx } from 'clsx'

export interface ArticleCardProps {
  title: string
  excerpt: string
  date: string
  slug: string
  publicationSlug: string
  isPaid: boolean
  authorName?: string
  readTimeMinutes?: number
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function ArticleCard({
  title,
  excerpt,
  date,
  slug,
  publicationSlug,
  isPaid,
  authorName,
  readTimeMinutes,
}: ArticleCardProps) {
  return (
    <article className="group rounded-xl border border-gray-800 bg-gray-900 p-5 hover:border-gray-700 hover:bg-gray-800/80 transition-all duration-200">
      <Link href={`/${publicationSlug}/${slug}`}>
        {/* Badge */}
        <div className="flex items-center gap-2 mb-3">
          <span
            className={clsx(
              'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
              isPaid
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            )}
          >
            {isPaid ? 'Платная' : 'Бесплатная'}
          </span>
          {readTimeMinutes && (
            <span className="text-xs text-gray-500">{readTimeMinutes} мин</span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-base font-semibold text-gray-100 group-hover:text-indigo-300 transition-colors mb-2 line-clamp-2">
          {title}
        </h3>

        {/* Excerpt */}
        <p className="text-sm text-gray-500 line-clamp-3 mb-4">{excerpt}</p>

        {/* Meta */}
        <div className="flex items-center justify-between">
          {authorName && (
            <span className="text-xs text-gray-600">{authorName}</span>
          )}
          <span className="text-xs text-gray-600">{formatDate(date)}</span>
        </div>
      </Link>
    </article>
  )
}
