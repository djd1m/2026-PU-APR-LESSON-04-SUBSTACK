'use client'

import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth'
import Link from 'next/link'

interface PaywallProps {
  publicationName: string
  publicationSlug: string
  priceMonthly: number
  priceYearly?: number
}

export function Paywall({
  publicationName,
  publicationSlug,
  priceMonthly,
  priceYearly,
}: PaywallProps) {
  const { isAuthenticated } = useAuth()

  return (
    <div className="relative">
      {/* Blur gradient overlay */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -top-20 bg-gradient-to-b from-transparent via-gray-950/80 to-gray-950 pointer-events-none z-10"
      />

      {/* Paywall card */}
      <div className="relative z-20 mx-auto max-w-lg rounded-2xl border border-gray-800 bg-gray-900 p-8 text-center shadow-2xl">
        {/* Icon */}
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-500/10 border border-indigo-500/20">
          <svg
            className="h-7 w-7 text-indigo-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
            />
          </svg>
        </div>

        <h2 className="text-xl font-bold text-gray-100 mb-2">
          Оформите подписку
        </h2>
        <p className="text-sm text-gray-400 mb-6">
          Эта статья доступна только платным подписчикам{' '}
          <span className="text-indigo-400 font-medium">{publicationName}</span>
        </p>

        {/* Pricing */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 px-5 py-4 flex-1">
            <div className="text-2xl font-bold text-gray-100">
              {priceMonthly.toLocaleString('ru-RU')} ₽
            </div>
            <div className="text-xs text-gray-500 mt-1">в месяц</div>
          </div>
          {priceYearly && (
            <div className="rounded-xl border border-gray-700 bg-gray-800 px-5 py-4 flex-1">
              <div className="text-2xl font-bold text-gray-100">
                {priceYearly.toLocaleString('ru-RU')} ₽
              </div>
              <div className="text-xs text-gray-500 mt-1">в год</div>
              <div className="text-xs text-emerald-400 mt-0.5">
                Экономия{' '}
                {Math.round(
                  ((priceMonthly * 12 - priceYearly) / (priceMonthly * 12)) * 100
                )}
                %
              </div>
            </div>
          )}
        </div>

        {/* CTA */}
        {isAuthenticated ? (
          <Link href={`/${publicationSlug}/subscribe`}>
            <Button variant="primary" size="lg" fullWidth>
              Оформить подписку
            </Button>
          </Link>
        ) : (
          <div className="flex flex-col gap-3">
            <Link href={`/auth/register?redirect=/${publicationSlug}`}>
              <Button variant="primary" size="lg" fullWidth>
                Создать аккаунт и подписаться
              </Button>
            </Link>
            <p className="text-xs text-gray-500">
              Уже есть аккаунт?{' '}
              <Link
                href="/auth/login"
                className="text-indigo-400 hover:text-indigo-300"
              >
                Войти
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
