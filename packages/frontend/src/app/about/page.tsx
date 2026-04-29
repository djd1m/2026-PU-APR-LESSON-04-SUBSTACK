import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'

export const metadata = {
  title: 'О платформе — SubStack RU',
  description: 'SubStack RU — российская платформа для независимых создателей контента',
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <Header />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-3xl font-bold mb-8">О платформе</h1>

        <div className="prose prose-invert prose-lg max-w-none space-y-6">
          <p>
            <strong>SubStack RU</strong> — российская платформа для независимых создателей контента.
            Мы помогаем авторам публиковать email-рассылки, подкасты и видео с монетизацией
            через платные подписки в рублях.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4">Для авторов</h2>
          <ul className="list-disc pl-6 space-y-2 text-gray-300">
            <li>Бесплатный запуск — платите только 10% с дохода</li>
            <li>Российские платежи: Mir, СБП, YooKassa</li>
            <li>Владение аудиторией: экспорт email-списка в один клик</li>
            <li>Yandex SEO из коробки</li>
            <li>AI-помощник для написания статей</li>
          </ul>

          <h2 className="text-xl font-semibold mt-8 mb-4">Для читателей</h2>
          <ul className="list-disc pl-6 space-y-2 text-gray-300">
            <li>Бесплатная подписка на любимых авторов</li>
            <li>Доставка статей прямо на email</li>
            <li>Поддержка авторов через платную подписку</li>
            <li>Рекомендации новых авторов</li>
          </ul>

          <h2 className="text-xl font-semibold mt-8 mb-4">Безопасность</h2>
          <p className="text-gray-300">
            Все данные хранятся на серверах в России в соответствии с 152-ФЗ.
            Платёжные данные обрабатываются сертифицированными провайдерами —
            мы не храним данные карт.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4">Контакты</h2>
          <p className="text-gray-300">
            Email: <a href="mailto:support@substackru.com" className="text-indigo-400">support@substackru.com</a>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  )
}
