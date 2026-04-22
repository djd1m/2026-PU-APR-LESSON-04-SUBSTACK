import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { QueryProvider } from '@/providers/query-provider'

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'SubStack RU — Платформа для авторов',
  description:
    'Публикуй статьи, собирай подписчиков и монетизируй контент на русском языке. Бесплатно до первого рубля.',
  keywords: ['блог', 'статьи', 'подписка', 'монетизация', 'авторы'],
  openGraph: {
    title: 'SubStack RU — Платформа для авторов',
    description: 'Публикуй статьи, собирай подписчиков и монетизируй контент.',
    locale: 'ru_RU',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru" className="dark">
      <body className={`${inter.variable} font-sans bg-gray-950 text-gray-100 antialiased`}>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  )
}
