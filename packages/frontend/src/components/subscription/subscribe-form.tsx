'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'

interface SubscribeFormProps {
  publicationSlug: string
  publicationName: string
}

export function SubscribeForm({ publicationSlug, publicationName }: SubscribeFormProps) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setStatus('loading')
    setErrorMessage('')

    try {
      await api.post(`/publications/${publicationSlug}/subscribe`, { email })
      setStatus('success')
      setEmail('')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка подписки'
      setErrorMessage(message)
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
          <svg
            className="h-6 w-6 text-emerald-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-gray-100 mb-1">
          Подписка оформлена!
        </h3>
        <p className="text-sm text-gray-400">
          Проверьте почту для подтверждения подписки на{' '}
          <span className="text-indigo-400">{publicationName}</span>
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
      <h3 className="text-base font-semibold text-gray-100 mb-1">
        Подписаться на {publicationName}
      </h3>
      <p className="text-sm text-gray-500 mb-4">
        Получайте новые статьи прямо на почту
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            type="email"
            placeholder="your@email.ru"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            error={status === 'error' ? errorMessage : undefined}
          />
        </div>
        <Button
          type="submit"
          variant="primary"
          isLoading={status === 'loading'}
          className="whitespace-nowrap"
        >
          Подписаться
        </Button>
      </form>
      <p className="mt-3 text-xs text-gray-600">
        Бесплатно. Можно отписаться в любой момент.
      </p>
    </div>
  )
}
