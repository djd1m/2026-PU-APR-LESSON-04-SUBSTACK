'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'

export function Header() {
  const { isAuthenticated, user, logout } = useAuth()

  return (
    <header className="sticky top-0 z-50 border-b border-gray-800 bg-gray-950/90 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 text-white font-bold text-sm group-hover:bg-indigo-600 transition-colors">
              S
            </div>
            <span className="font-semibold text-gray-100 text-lg">
              SubStack{' '}
              <span className="text-indigo-400">RU</span>
            </span>
          </Link>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/#features"
              className="text-sm text-gray-400 hover:text-gray-100 transition-colors"
            >
              Возможности
            </Link>
            <Link
              href="/#pricing"
              className="text-sm text-gray-400 hover:text-gray-100 transition-colors"
            >
              Тарифы
            </Link>
            {isAuthenticated && (
              <Link
                href="/dashboard"
                className="text-sm text-gray-400 hover:text-gray-100 transition-colors"
              >
                Панель управления
              </Link>
            )}
          </nav>

          {/* Auth */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <span className="hidden sm:block text-sm text-gray-400">
                  {user?.name}
                </span>
                <Link href="/dashboard">
                  <Button variant="secondary" size="sm">
                    Панель
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={logout}>
                  Выйти
                </Button>
              </>
            ) : (
              <>
                <Link href="/auth/login">
                  <Button variant="ghost" size="sm">
                    Войти
                  </Button>
                </Link>
                <Link href="/auth/register">
                  <Button variant="primary" size="sm">
                    Начать бесплатно
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
