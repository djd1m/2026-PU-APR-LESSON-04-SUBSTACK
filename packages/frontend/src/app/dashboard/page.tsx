'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'

interface DashboardStats {
  totalSubscribers: number
  paidSubscribers: number
  mrr: number
  openRate: number
  subscriberGrowth: number
  mrrGrowth: number
}

function StatCard({
  label,
  value,
  sub,
  trend,
}: {
  label: string
  value: string
  sub?: string
  trend?: { value: number; label: string }
}) {
  const trendPositive = (trend?.value ?? 0) >= 0
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-100">{value}</p>
      {sub && <p className="text-xs text-gray-600 mt-1">{sub}</p>}
      {trend && (
        <div
          className={`inline-flex items-center gap-1 mt-2 text-xs font-medium ${
            trendPositive ? 'text-emerald-400' : 'text-red-400'
          }`}
        >
          <svg
            className={`h-3.5 w-3.5 ${!trendPositive ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
          </svg>
          {Math.abs(trend.value)}% {trend.label}
        </div>
      )}
    </div>
  )
}

function PlaceholderChart({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
      <h3 className="text-sm font-medium text-gray-400 mb-4">{label}</h3>
      <div className="h-40 flex items-end gap-2">
        {[40, 55, 45, 70, 60, 80, 75, 90, 85, 95, 88, 100].map((height, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-sm bg-indigo-500/20 hover:bg-indigo-500/40 transition-colors cursor-pointer"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between mt-2">
        <span className="text-xs text-gray-600">Янв</span>
        <span className="text-xs text-gray-600">Дек</span>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get<DashboardStats>('/author/stats'),
    // Use placeholder data until API is available
    placeholderData: {
      totalSubscribers: 1_247,
      paidSubscribers: 84,
      mrr: 42_000,
      openRate: 54.3,
      subscriberGrowth: 12,
      mrrGrowth: 8,
    },
  })

  const statCards = [
    {
      label: 'Всего подписчиков',
      value: stats?.totalSubscribers.toLocaleString('ru-RU') ?? '—',
      trend: { value: stats?.subscriberGrowth ?? 0, label: 'за месяц' },
    },
    {
      label: 'Платных подписчиков',
      value: stats?.paidSubscribers.toLocaleString('ru-RU') ?? '—',
      sub: `${Math.round(((stats?.paidSubscribers ?? 0) / (stats?.totalSubscribers ?? 1)) * 100)}% от общего числа`,
    },
    {
      label: 'Ежемесячный доход (MRR)',
      value: stats ? `${stats.mrr.toLocaleString('ru-RU')} ₽` : '—',
      trend: { value: stats?.mrrGrowth ?? 0, label: 'за месяц' },
    },
    {
      label: 'Открываемость писем',
      value: stats ? `${stats.openRate}%` : '—',
      sub: 'Средняя по всем рассылкам',
    },
  ]

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-100">
          Добро пожаловать, {user?.name?.split(' ')[0] ?? 'Автор'} 👋
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Вот что происходит с вашей публикацией
        </p>
      </div>

      {/* Stats grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-800 bg-gray-900 p-6 animate-pulse">
              <div className="h-4 w-24 bg-gray-800 rounded mb-3" />
              <div className="h-8 w-32 bg-gray-800 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {statCards.map((card) => (
            <StatCard key={card.label} {...card} />
          ))}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <PlaceholderChart label="Рост подписчиков" />
        <PlaceholderChart label="Ежемесячный доход (₽)" />
      </div>

      {/* Recent articles placeholder */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-400">Последние статьи</h3>
          <a href="/dashboard/articles" className="text-xs text-indigo-400 hover:text-indigo-300">
            Все статьи →
          </a>
        </div>
        <div className="space-y-3">
          {[
            { title: 'Как я заработал первый миллион рублей на блоге', date: '20 апр 2026', views: 1240, isPaid: false },
            { title: 'Монетизация экспертного контента: полное руководство', date: '15 апр 2026', views: 890, isPaid: true },
            { title: 'Email-рассылки vs. социальные сети: что выбрать', date: '10 апр 2026', views: 2100, isPaid: false },
          ].map((article) => (
            <div
              key={article.title}
              className="flex items-center justify-between py-3 border-t border-gray-800 first:border-t-0"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    article.isPaid
                      ? 'bg-amber-500/10 text-amber-400'
                      : 'bg-emerald-500/10 text-emerald-400'
                  }`}
                >
                  {article.isPaid ? 'Платная' : 'Бесплатная'}
                </span>
                <span className="text-sm text-gray-300 truncate">{article.title}</span>
              </div>
              <div className="shrink-0 flex items-center gap-4 ml-4">
                <span className="text-xs text-gray-500">{article.views.toLocaleString('ru-RU')} просм.</span>
                <span className="text-xs text-gray-600">{article.date}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
