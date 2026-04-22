import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t border-gray-800 bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 text-white font-bold text-sm">
                S
              </div>
              <span className="font-semibold text-gray-100 text-lg">
                SubStack <span className="text-indigo-400">RU</span>
              </span>
            </div>
            <p className="text-sm text-gray-500 max-w-xs">
              Платформа для русскоязычных авторов. Публикуй, монетизируй и
              развивай свою аудиторию без посредников.
            </p>
          </div>

          {/* Авторам */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Авторам</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/auth/register" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
                  Начать писать
                </Link>
              </li>
              <li>
                <Link href="/#features" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
                  Возможности
                </Link>
              </li>
              <li>
                <Link href="/#pricing" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
                  Тарифы
                </Link>
              </li>
            </ul>
          </div>

          {/* Компания */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Компания</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
                  О платформе
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
                  Политика конфиденциальности
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
                  Условия использования
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-gray-600">
            © {new Date().getFullYear()} SubStack RU. Все права защищены.
          </p>
          <p className="text-xs text-gray-600">
            Сделано для русскоязычных авторов
          </p>
        </div>
      </div>
    </footer>
  )
}
