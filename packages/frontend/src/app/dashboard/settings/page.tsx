'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'

export default function SettingsPage() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [slug, setSlug] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError('')
    setSuccess(false)
    try {
      await api.post('/publications', {
        name: name.trim(),
        description: description.trim(),
        ...(slug.trim() ? { slug: slug.trim().toLowerCase() } : {}),
      })
      setSuccess(true)
      setTimeout(() => {
        window.location.href = '/dashboard/editor'
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка создания публикации')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-100 mb-2">Настройки</h1>
      <p className="text-gray-500 mb-8">Создайте или настройте вашу публикацию</p>

      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h2 className="text-lg font-semibold text-gray-200 mb-4">Новая публикация</h2>

        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Название публикации"
            placeholder="Мой блог"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="Описание"
            placeholder="О чём ваша публикация?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Input
            label="URL-адрес (slug)"
            placeholder="moy-blog (оставьте пустым для автогенерации)"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            hint="Латинские буквы, цифры и дефисы. Например: tech-digest"
          />

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
          {success && (
            <p className="text-sm text-emerald-400">Публикация создана! Переход к редактору...</p>
          )}

          <Button
            type="submit"
            variant="primary"
            isLoading={saving}
            disabled={!name.trim()}
          >
            Создать публикацию
          </Button>
        </form>
      </div>
    </div>
  )
}
