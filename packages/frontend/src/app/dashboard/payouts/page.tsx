'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'

interface RevenueBreakdown {
  grossRevenue: number
  platformFees: number
  processorFees: number
  netRevenue: number
  pendingBalance: number
  payouts: Payout[]
}

interface Payout {
  id: string
  amount: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  periodStart: string
  periodEnd: string
  createdAt: string
  completedAt: string | null
}

function formatRub(kopecks: number): string {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0 }).format(kopecks / 100)
}

const statusLabels: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Ожидает', cls: 'bg-yellow-500/20 text-yellow-400' },
  processing: { label: 'В обработке', cls: 'bg-blue-500/20 text-blue-400' },
  completed: { label: 'Выплачено', cls: 'bg-emerald-500/20 text-emerald-400' },
  failed: { label: 'Ошибка', cls: 'bg-red-500/20 text-red-400' },
}

export default function PayoutsPage() {
  const [revenue, setRevenue] = useState<RevenueBreakdown | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const data = await api.get<RevenueBreakdown>('/author/revenue')
        setRevenue(data)
      } catch {
        setRevenue(null)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin h-8 w-8 rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-100 mb-6">Выплаты</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <p className="text-xs text-gray-500 uppercase font-medium">Общий доход</p>
          <p className="text-2xl font-bold text-gray-100 mt-1">{formatRub(revenue?.grossRevenue ?? 0)}</p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <p className="text-xs text-gray-500 uppercase font-medium">Комиссия платформы (10%)</p>
          <p className="text-2xl font-bold text-gray-400 mt-1">{formatRub(revenue?.platformFees ?? 0)}</p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <p className="text-xs text-gray-500 uppercase font-medium">Чистый доход</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{formatRub(revenue?.netRevenue ?? 0)}</p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <p className="text-xs text-gray-500 uppercase font-medium">Ожидает выплаты</p>
          <p className="text-2xl font-bold text-amber-400 mt-1">{formatRub(revenue?.pendingBalance ?? 0)}</p>
        </div>
      </div>

      {/* Bank details */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-200 mb-3">Реквизиты для выплат</h2>
        <p className="text-sm text-gray-500 mb-4">Выплаты производятся 1-го числа каждого месяца при балансе от 1 000 руб.</p>
        <a
          href="/dashboard/settings"
          className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          Настроить реквизиты →
        </a>
      </div>

      {/* Payout history */}
      <h2 className="text-lg font-semibold text-gray-200 mb-4">История выплат</h2>

      {!revenue?.payouts?.length ? (
        <div className="text-center py-16 rounded-xl border border-gray-800 bg-gray-900">
          <p className="text-gray-500">Выплат пока не было</p>
          <p className="text-gray-600 text-sm mt-1">Первая выплата будет произведена при накоплении 1 000 руб.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Период</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Сумма</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Статус</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Дата</th>
              </tr>
            </thead>
            <tbody>
              {revenue.payouts.map(p => {
                const st = statusLabels[p.status] ?? statusLabels.pending
                return (
                  <tr key={p.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {new Date(p.periodStart).toLocaleDateString('ru-RU')} — {new Date(p.periodEnd).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-200">{formatRub(p.amount)}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${st.cls}`}>{st.label}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(p.createdAt).toLocaleDateString('ru-RU')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
