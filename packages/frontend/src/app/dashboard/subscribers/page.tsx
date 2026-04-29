'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'

interface Subscriber {
  id: string
  email: string
  type: 'free' | 'paid'
  subscribedAt: string
}

export default function SubscribersPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'free' | 'paid'>('all')

  useEffect(() => {
    async function load() {
      try {
        // Try to load subscribers from API
        const data = await api.get<Subscriber[]>('/author/subscribers')
        setSubscribers(data)
      } catch {
        // API might not be ready yet — show empty state
        setSubscribers([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = filter === 'all'
    ? subscribers
    : subscribers.filter(s => s.type === filter)

  const freeCount = subscribers.filter(s => s.type === 'free').length
  const paidCount = subscribers.filter(s => s.type === 'paid').length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin h-8 w-8 rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Подписчики</h1>
          <p className="text-sm text-gray-500 mt-1">
            Всего: {subscribers.length} (бесплатных: {freeCount}, платных: {paidCount})
          </p>
        </div>
        <a
          href="/api/author/subscribers/export"
          target="_blank"
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors"
        >
          Экспорт CSV
        </a>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {(['all', 'free', 'paid'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
            }`}
          >
            {f === 'all' ? `Все (${subscribers.length})` : f === 'free' ? `Бесплатные (${freeCount})` : `Платные (${paidCount})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-500 text-lg">Пока нет подписчиков</p>
          <p className="text-gray-600 text-sm mt-2">
            Поделитесь ссылкой на вашу публикацию, чтобы привлечь первых читателей
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Тип</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Дата подписки</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(sub => (
                <tr key={sub.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-6 py-4 text-sm text-gray-200">{sub.email}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      sub.type === 'paid'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {sub.type === 'paid' ? 'Платный' : 'Бесплатный'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(sub.subscribedAt).toLocaleDateString('ru-RU')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
