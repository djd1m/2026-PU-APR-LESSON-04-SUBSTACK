'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'

interface Publication {
  id: string
  name: string
  slug: string
  description: string
  paid_enabled: boolean
  paid_price_monthly: number
}

export default function SettingsPage() {
  // Publication state
  const [publications, setPublications] = useState<Publication[]>([])
  const [loadingPubs, setLoadingPubs] = useState(true)
  const [pubName, setPubName] = useState('')
  const [pubDescription, setPubDescription] = useState('')
  const [pubSlug, setPubSlug] = useState('')
  const [pubSaving, setPubSaving] = useState(false)
  const [pubSuccess, setPubSuccess] = useState('')
  const [pubError, setPubError] = useState('')

  // Bank details state
  const [bankName, setBankName] = useState('')
  const [bik, setBik] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [inn, setInn] = useState('')
  const [bankSaving, setBankSaving] = useState(false)
  const [bankSuccess, setBankSuccess] = useState('')
  const [bankError, setBankError] = useState('')

  // Email (Resend) state
  const [resendKey, setResendKey] = useState('')
  const [emailFrom, setEmailFrom] = useState('')
  const [emailConfigured, setEmailConfigured] = useState(false)
  const [emailKeyPreview, setEmailKeyPreview] = useState('')
  const [emailSaving, setEmailSaving] = useState(false)
  const [emailSuccess, setEmailSuccess] = useState('')
  const [emailError, setEmailError] = useState('')

  // Load email settings
  useEffect(() => {
    async function loadEmailSettings() {
      try {
        const data = await api.get<{ configured: boolean; from: string; apiKeyPreview: string | null }>('/settings/email/test')
        setEmailConfigured(data.configured)
        setEmailFrom(data.from)
        setEmailKeyPreview(data.apiKeyPreview ?? '')
      } catch {
        // settings endpoint may not exist yet
      }
    }
    loadEmailSettings()
  }, [])

  useEffect(() => {
    async function load() {
      try {
        const pubs = await api.get<Publication[]>('/publications/my')
        setPublications(pubs)
      } catch {
        setPublications([])
      } finally {
        setLoadingPubs(false)
      }
    }
    load()
  }, [])

  const handleCreatePublication = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pubName.trim()) return
    setPubSaving(true)
    setPubError('')
    setPubSuccess('')
    try {
      const pub = await api.post<Publication>('/publications', {
        name: pubName.trim(),
        description: pubDescription.trim(),
        ...(pubSlug.trim() ? { slug: pubSlug.trim().toLowerCase() } : {}),
      })
      setPublications(prev => [...prev, pub])
      setPubSuccess('Публикация создана!')
      setPubName('')
      setPubDescription('')
      setPubSlug('')
    } catch (err) {
      setPubError(err instanceof Error ? err.message : 'Ошибка создания')
    } finally {
      setPubSaving(false)
    }
  }

  const handleSaveBankDetails = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bankName.trim() || !bik.trim() || !accountNumber.trim()) return
    setBankSaving(true)
    setBankError('')
    setBankSuccess('')
    try {
      await api.patch('/author/payouts/bank-details', {
        bankName: bankName.trim(),
        bik: bik.trim(),
        accountNumber: accountNumber.trim(),
        ...(inn.trim() ? { inn: inn.trim() } : {}),
      })
      setBankSuccess('Реквизиты сохранены')
    } catch (err) {
      setBankError(err instanceof Error ? err.message : 'Ошибка сохранения')
    } finally {
      setBankSaving(false)
    }
  }

  const handleSaveEmailSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailSaving(true)
    setEmailError('')
    setEmailSuccess('')
    try {
      await api.patch('/settings', {
        ...(resendKey.trim() ? { resend_api_key: resendKey.trim() } : {}),
        ...(emailFrom.trim() ? { email_from: emailFrom.trim() } : {}),
      })
      setEmailSuccess('Email-настройки сохранены')
      setResendKey('')
      // Reload status
      const data = await api.get<{ configured: boolean; from: string; apiKeyPreview: string | null }>('/settings/email/test')
      setEmailConfigured(data.configured)
      setEmailKeyPreview(data.apiKeyPreview ?? '')
      setEmailFrom(data.from)
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : 'Ошибка сохранения')
    } finally {
      setEmailSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-gray-100">Настройки</h1>

      {/* ─── Existing Publications ─── */}
      {!loadingPubs && publications.length > 0 && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h2 className="text-lg font-semibold text-gray-200 mb-4">Мои публикации</h2>
          <div className="space-y-3">
            {publications.map(pub => (
              <div key={pub.id} className="flex items-center justify-between p-4 rounded-lg bg-gray-800/50 border border-gray-700/50">
                <div>
                  <p className="font-medium text-gray-200">{pub.name}</p>
                  <p className="text-sm text-gray-500">/{pub.slug}</p>
                </div>
                <div className="flex items-center gap-3">
                  {pub.paid_enabled ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-amber-500/20 text-amber-400">
                      Платная: {pub.paid_price_monthly / 100} руб/мес
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-700 text-gray-400">
                      Бесплатная
                    </span>
                  )}
                  <a
                    href={`/dashboard/editor`}
                    className="text-sm text-indigo-400 hover:text-indigo-300"
                  >
                    Написать →
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Create New Publication ─── */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h2 className="text-lg font-semibold text-gray-200 mb-4">
          {publications.length > 0 ? 'Создать ещё одну публикацию' : 'Создать публикацию'}
        </h2>

        <form onSubmit={handleCreatePublication} className="space-y-4">
          <Input
            label="Название"
            placeholder="Мой блог"
            value={pubName}
            onChange={(e) => setPubName(e.target.value)}
            required
          />
          <Input
            label="Описание"
            placeholder="О чём ваша публикация?"
            value={pubDescription}
            onChange={(e) => setPubDescription(e.target.value)}
          />
          <Input
            label="URL-адрес (slug)"
            placeholder="moy-blog (оставьте пустым для автогенерации)"
            value={pubSlug}
            onChange={(e) => setPubSlug(e.target.value)}
            hint="Латинские буквы, цифры и дефисы"
          />

          {pubError && <p className="text-sm text-red-400">{pubError}</p>}
          {pubSuccess && <p className="text-sm text-emerald-400">{pubSuccess}</p>}

          <Button type="submit" variant="primary" isLoading={pubSaving} disabled={!pubName.trim()}>
            Создать публикацию
          </Button>
        </form>
      </div>

      {/* ─── Bank Details (Payouts) ─── */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h2 className="text-lg font-semibold text-gray-200 mb-2">Реквизиты для выплат</h2>
        <p className="text-sm text-gray-500 mb-4">
          Выплаты производятся 1-го числа каждого месяца при балансе от 1 000 руб.
        </p>

        <form onSubmit={handleSaveBankDetails} className="space-y-4">
          <Input
            label="Название банка"
            placeholder="Сбербанк, Тинькофф, Альфа-Банк..."
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            required
          />
          <Input
            label="БИК"
            placeholder="044525225"
            value={bik}
            onChange={(e) => setBik(e.target.value)}
            hint="9 цифр"
            required
          />
          <Input
            label="Номер расчётного счёта"
            placeholder="40817810099910004312"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            hint="20 цифр"
            required
          />
          <Input
            label="ИНН (необязательно)"
            placeholder="7707083893"
            value={inn}
            onChange={(e) => setInn(e.target.value)}
            hint="10 или 12 цифр"
          />

          {bankError && <p className="text-sm text-red-400">{bankError}</p>}
          {bankSuccess && <p className="text-sm text-emerald-400">{bankSuccess}</p>}

          <Button type="submit" variant="primary" isLoading={bankSaving} disabled={!bankName.trim() || !bik.trim() || !accountNumber.trim()}>
            Сохранить реквизиты
          </Button>
        </form>
      </div>

      {/* ─── Email Settings (Resend) ─── */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-gray-200">Email-рассылка (Resend)</h2>
          {emailConfigured ? (
            <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400">Настроено</span>
          ) : (
            <span className="text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-400">Не настроено</span>
          )}
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Для отправки email подписчикам нужен API ключ от{' '}
          <a href="https://resend.com" target="_blank" rel="noopener" className="text-indigo-400 hover:text-indigo-300">resend.com</a>.
          Зарегистрируйтесь, подтвердите домен и скопируйте ключ.
        </p>

        {emailKeyPreview && (
          <p className="text-sm text-gray-400 mb-4">
            Текущий ключ: <code className="bg-gray-800 px-2 py-0.5 rounded text-emerald-400">{emailKeyPreview}</code>
          </p>
        )}

        <form onSubmit={handleSaveEmailSettings} className="space-y-4">
          <Input
            label="Resend API Key"
            placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            value={resendKey}
            onChange={(e) => setResendKey(e.target.value)}
            hint="Начинается с re_. Оставьте пустым, чтобы не менять"
          />
          <Input
            label="Email отправителя"
            placeholder="noreply@yourdomain.com"
            value={emailFrom}
            onChange={(e) => setEmailFrom(e.target.value)}
            hint="Домен должен быть подтверждён в Resend"
          />

          {emailError && <p className="text-sm text-red-400">{emailError}</p>}
          {emailSuccess && <p className="text-sm text-emerald-400">{emailSuccess}</p>}

          <Button type="submit" variant="primary" isLoading={emailSaving}>
            Сохранить email-настройки
          </Button>
        </form>
      </div>
    </div>
  )
}
