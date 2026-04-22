import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Button } from '@/components/ui/button'

const features = [
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
    ),
    title: 'Email-рассылки',
    description:
      'Автоматическая доставка новых статей прямо в почтовый ящик подписчиков. Высокая доставляемость без спам-фильтров.',
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
    title: 'Платные подписки в рублях',
    description:
      'Принимайте оплату в рублях через российские платёжные системы. Прозрачные выплаты без задержек.',
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
    ),
    title: 'Оптимизация для Яндекс',
    description:
      'Статьи индексируются Яндексом. SEO-метаданные, структурированные данные и быстрая загрузка в подарок.',
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
    ),
    title: 'Экспорт в CSV',
    description:
      'Выгружайте базу подписчиков в любой момент. Ваши данные — ваша собственность, без блокировок.',
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    title: 'Детальная аналитика',
    description:
      'Открываемость писем, клики, рост подписчиков и доходы — всё в одном дашборде на русском языке.',
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
      </svg>
    ),
    title: 'Удобный редактор',
    description:
      'Богатый текстовый редактор с форматированием, изображениями и предпросмотром. Пиши как в Notion.',
  },
]

const stats = [
  { label: 'Активных авторов', value: '1 200+' },
  { label: 'Подписчиков', value: '85 000+' },
  { label: 'Статей опубликовано', value: '12 000+' },
  { label: 'Комиссия платформы', value: 'только 10%' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <Header />

      <main>
        {/* Hero section */}
        <section className="relative overflow-hidden">
          {/* Background glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <div className="h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-20 text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/5 px-4 py-1.5 mb-8">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
              <span className="text-xs text-indigo-300 font-medium">
                Платформа для русскоязычных авторов
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight mb-6">
              <span className="text-gray-100">Публикуй.</span>{' '}
              <span className="text-gray-100">Зарабатывай.</span>
              <br />
              <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                Без посредников.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="mx-auto max-w-2xl text-lg sm:text-xl text-gray-400 mb-4">
              Создай свой медиапроект на русском языке. Бесплатно до первого
              заработанного рубля — берём только{' '}
              <span className="text-indigo-400 font-semibold">10%</span> с
              платных подписок.
            </p>
            <p className="text-sm text-gray-500 mb-10">
              Ваши подписчики, ваши данные, ваши деньги.
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/auth/register">
                <Button variant="primary" size="lg">
                  Создать публикацию
                </Button>
              </Link>
              <Link href="/#features">
                <Button variant="outline" size="lg">
                  Узнать больше
                </Button>
              </Link>
            </div>

            <p className="mt-6 text-xs text-gray-600">
              Регистрация бесплатна. Карта не нужна.
            </p>
          </div>
        </section>

        {/* Stats */}
        <section className="border-y border-gray-800 bg-gray-900/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
            <dl className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <dt className="text-sm text-gray-500 mb-1">{stat.label}</dt>
                  <dd className="text-2xl font-bold text-gray-100">{stat.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-100 mb-4">
                Всё необходимое для автора
              </h2>
              <p className="text-gray-400 max-w-xl mx-auto">
                Инструменты, которые нужны для роста аудитории и монетизации контента.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-xl border border-gray-800 bg-gray-900 p-6 hover:border-gray-700 transition-colors"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                    {feature.icon}
                  </div>
                  <h3 className="text-base font-semibold text-gray-100 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-24 border-t border-gray-800">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-100 mb-4">
              Простые и честные тарифы
            </h2>
            <p className="text-gray-400 mb-12">
              Платите только когда зарабатываете.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
              {/* Free */}
              <div className="rounded-2xl border border-gray-700 bg-gray-900 p-8">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-100 mb-2">Бесплатный</h3>
                  <div className="text-4xl font-bold text-gray-100">0 ₽</div>
                  <p className="text-sm text-gray-500 mt-1">навсегда</p>
                </div>
                <ul className="space-y-3 mb-8">
                  {[
                    'Неограниченные статьи',
                    'Email-рассылки',
                    'До 1000 бесплатных подписчиков',
                    'Базовая аналитика',
                    'Экспорт в CSV',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm text-gray-400">
                      <svg className="h-4 w-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/auth/register">
                  <Button variant="outline" fullWidth>
                    Начать бесплатно
                  </Button>
                </Link>
              </div>

              {/* Paid */}
              <div className="rounded-2xl border border-indigo-500/40 bg-indigo-500/5 p-8 relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-indigo-500 px-3 py-1 text-xs font-medium text-white">
                    Рекомендуем
                  </span>
                </div>
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-100 mb-2">С монетизацией</h3>
                  <div className="text-4xl font-bold text-gray-100">10%</div>
                  <p className="text-sm text-gray-500 mt-1">только от платных подписок</p>
                </div>
                <ul className="space-y-3 mb-8">
                  {[
                    'Всё из бесплатного плана',
                    'Платные подписки в рублях',
                    'Неограниченные подписчики',
                    'Детальная аналитика',
                    'Выплаты на российские счета',
                    'Приоритетная поддержка',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm text-gray-300">
                      <svg className="h-4 w-4 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/auth/register">
                  <Button variant="primary" fullWidth>
                    Начать зарабатывать
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="py-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-500/20 p-10 text-center">
              <h2 className="text-3xl font-bold text-gray-100 mb-4">
                Готов начать?
              </h2>
              <p className="text-gray-400 mb-8 max-w-md mx-auto">
                Присоединяйся к тысячам авторов, которые уже публикуют и
                зарабатывают на SubStack RU.
              </p>
              <Link href="/auth/register">
                <Button variant="primary" size="lg">
                  Создать публикацию бесплатно
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
