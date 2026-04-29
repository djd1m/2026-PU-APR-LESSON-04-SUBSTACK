import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'

export const metadata = {
  title: 'Условия использования — SubStack RU',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <Header />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-3xl font-bold mb-2">Условия использования</h1>
        <p className="text-sm text-gray-500 mb-8">Последнее обновление: 29 апреля 2026 г.</p>

        <div className="prose prose-invert max-w-none space-y-6 text-gray-300">
          <h2 className="text-lg font-semibold text-gray-100">1. Общие положения</h2>
          <p>
            Настоящие Условия использования регулируют отношения между пользователями
            и платформой SubStack RU. Регистрируясь на Платформе, вы соглашаетесь
            с настоящими Условиями.
          </p>

          <h2 className="text-lg font-semibold text-gray-100">2. Регистрация</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Для использования Платформы необходимо создать учётную запись</li>
            <li>Вы обязуетесь предоставить достоверную информацию</li>
            <li>Вы несёте ответственность за сохранность своего пароля</li>
            <li>Один пользователь — одна учётная запись</li>
          </ul>

          <h2 className="text-lg font-semibold text-gray-100">3. Для авторов</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Авторы самостоятельно определяют содержание своих публикаций</li>
            <li>Авторы несут ответственность за публикуемый контент</li>
            <li>Платформа взимает комиссию 10% с платных подписок</li>
            <li>Выплаты производятся ежемесячно при балансе от 1 000 рублей</li>
            <li>Авторы могут экспортировать список подписчиков в любой момент</li>
          </ul>

          <h2 className="text-lg font-semibold text-gray-100">4. Для читателей</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Бесплатная подписка доступна для всех зарегистрированных пользователей</li>
            <li>Платная подписка оформляется через российские платёжные системы</li>
            <li>Отмена подписки возможна в любой момент — доступ сохраняется до конца оплаченного периода</li>
            <li>Возврат средств осуществляется в соответствии с законодательством РФ</li>
          </ul>

          <h2 className="text-lg font-semibold text-gray-100">5. Запрещённый контент</h2>
          <p>На Платформе запрещено публиковать:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Контент, нарушающий законодательство РФ</li>
            <li>Спам и нежелательные рассылки</li>
            <li>Материалы, нарушающие права третьих лиц</li>
            <li>Вредоносное ПО и фишинговые ссылки</li>
          </ul>

          <h2 className="text-lg font-semibold text-gray-100">6. Модерация</h2>
          <p>
            Платформа оставляет за собой право удалять контент, нарушающий настоящие Условия,
            и блокировать учётные записи нарушителей. Решения по требованиям Роскомнадзора
            исполняются в течение 24 часов.
          </p>

          <h2 className="text-lg font-semibold text-gray-100">7. Ограничение ответственности</h2>
          <p>
            Платформа предоставляется «как есть». Мы не гарантируем бесперебойную работу
            сервиса. Платформа не несёт ответственности за содержание публикаций авторов.
          </p>

          <h2 className="text-lg font-semibold text-gray-100">8. Контакты</h2>
          <p>
            По вопросам использования:{' '}
            <a href="mailto:support@substackru.com" className="text-indigo-400">support@substackru.com</a>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  )
}
