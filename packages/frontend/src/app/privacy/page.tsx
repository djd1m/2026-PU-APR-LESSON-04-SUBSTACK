import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'

export const metadata = {
  title: 'Политика конфиденциальности — SubStack RU',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <Header />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-3xl font-bold mb-2">Политика конфиденциальности</h1>
        <p className="text-sm text-gray-500 mb-8">Последнее обновление: 29 апреля 2026 г.</p>

        <div className="prose prose-invert max-w-none space-y-6 text-gray-300">
          <h2 className="text-lg font-semibold text-gray-100">1. Общие положения</h2>
          <p>
            Настоящая Политика конфиденциальности определяет порядок обработки и защиты
            персональных данных пользователей платформы SubStack RU (далее — «Платформа»).
            Платформа соблюдает требования Федерального закона от 27.07.2006 №152-ФЗ
            «О персональных данных».
          </p>

          <h2 className="text-lg font-semibold text-gray-100">2. Какие данные мы собираем</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Email-адрес — для авторизации и доставки рассылок</li>
            <li>Имя — для отображения в профиле</li>
            <li>Платёжные данные — обрабатываются через сертифицированных провайдеров (CloudPayments, YooKassa), мы не храним данные карт</li>
            <li>Данные об использовании — для аналитики и улучшения сервиса</li>
          </ul>

          <h2 className="text-lg font-semibold text-gray-100">3. Как мы используем данные</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Предоставление доступа к сервису</li>
            <li>Доставка email-рассылок</li>
            <li>Обработка платежей</li>
            <li>Улучшение качества сервиса</li>
            <li>Выполнение требований законодательства</li>
          </ul>

          <h2 className="text-lg font-semibold text-gray-100">4. Хранение данных</h2>
          <p>
            Все персональные данные пользователей хранятся на серверах, расположенных
            на территории Российской Федерации, в соответствии с требованиями 152-ФЗ.
          </p>

          <h2 className="text-lg font-semibold text-gray-100">5. Права пользователя</h2>
          <p>Вы имеете право:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Запросить информацию о хранимых данных</li>
            <li>Потребовать исправления неточных данных</li>
            <li>Потребовать удаления своих данных</li>
            <li>Отозвать согласие на обработку данных</li>
          </ul>

          <h2 className="text-lg font-semibold text-gray-100">6. Cookies</h2>
          <p>
            Платформа использует cookies для авторизации и обеспечения работы сервиса.
            Используя Платформу, вы соглашаетесь с использованием cookies.
          </p>

          <h2 className="text-lg font-semibold text-gray-100">7. Контакты</h2>
          <p>
            По вопросам обработки персональных данных:{' '}
            <a href="mailto:privacy@substackru.com" className="text-indigo-400">privacy@substackru.com</a>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  )
}
