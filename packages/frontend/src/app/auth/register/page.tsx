'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function RegisterPage() {
  const router = useRouter()
  const { register, isLoading, error, clearError } = useAuth()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [passwordError, setPasswordError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    clearError()
    if (e.target.name === 'password') setPasswordError('')
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (form.password.length < 8) {
      setPasswordError('Пароль должен содержать не менее 8 символов')
      return
    }

    try {
      await register(form)
      router.push('/dashboard')
    } catch {
      // error is handled in store
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      {/* Background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 flex items-start justify-center overflow-hidden"
      >
        <div className="h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl mt-20" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500 text-white font-bold">
              S
            </div>
            <span className="font-semibold text-xl text-gray-100">
              SubStack <span className="text-indigo-400">RU</span>
            </span>
          </Link>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8">
          <h1 className="text-2xl font-bold text-gray-100 mb-2">Регистрация</h1>
          <p className="text-sm text-gray-500 mb-6">
            Создайте аккаунт автора — это бесплатно
          </p>

          {error && (
            <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Имя"
              name="name"
              type="text"
              placeholder="Как вас зовут?"
              value={form.name}
              onChange={handleChange}
              required
              autoComplete="name"
            />
            <Input
              label="Email"
              name="email"
              type="email"
              placeholder="your@email.ru"
              value={form.email}
              onChange={handleChange}
              required
              autoComplete="email"
            />
            <Input
              label="Пароль"
              name="password"
              type="password"
              placeholder="Минимум 8 символов"
              value={form.password}
              onChange={handleChange}
              required
              autoComplete="new-password"
              error={passwordError}
              hint="Минимум 8 символов"
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isLoading}
              className="mt-2"
            >
              Создать аккаунт
            </Button>
          </form>

          <p className="mt-4 text-xs text-center text-gray-600">
            Регистрируясь, вы соглашаетесь с{' '}
            <Link href="/terms" className="text-indigo-400 hover:text-indigo-300">
              условиями использования
            </Link>{' '}
            и{' '}
            <Link href="/privacy" className="text-indigo-400 hover:text-indigo-300">
              политикой конфиденциальности
            </Link>
          </p>

          <p className="mt-6 text-center text-sm text-gray-500">
            Уже есть аккаунт?{' '}
            <Link
              href="/auth/login"
              className="text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
            >
              Войти
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
