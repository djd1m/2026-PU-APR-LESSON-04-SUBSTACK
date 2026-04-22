'use client'

import { useState, useCallback, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { clsx } from 'clsx'

type ArticleVisibility = 'free' | 'paid'
type PublishAction = 'publish' | 'schedule' | 'draft'

interface Publication {
  id: string
  name: string
  slug: string
}

interface ArticlePayload {
  title: string
  content_markdown: string
  visibility: ArticleVisibility
  status: 'draft' | 'published' | 'scheduled'
}

function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void
  active?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={clsx(
        'p-1.5 rounded text-sm font-medium transition-colors',
        active
          ? 'bg-indigo-500/20 text-indigo-300'
          : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
      )}
    >
      {children}
    </button>
  )
}

export default function EditorPage() {
  const [title, setTitle] = useState('')
  const [visibility, setVisibility] = useState<ArticleVisibility>('free')
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [showSchedule, setShowSchedule] = useState(false)
  const [scheduledAt, setScheduledAt] = useState('')
  const [publications, setPublications] = useState<Publication[]>([])
  const [selectedPubId, setSelectedPubId] = useState<string>('')
  const [loadingPubs, setLoadingPubs] = useState(true)

  // Load author's publications on mount
  useEffect(() => {
    async function loadPublications() {
      try {
        const pubs = await api.get<Publication[]>('/author/publications')
        setPublications(pubs)
        if (pubs.length > 0) {
          setSelectedPubId(pubs[0].id)
        }
      } catch {
        // If endpoint doesn't exist yet, try alternative
        try {
          const pubs = await api.get<Publication[]>('/publications/my')
          setPublications(pubs)
          if (pubs.length > 0) {
            setSelectedPubId(pubs[0].id)
          }
        } catch {
          setPublications([])
        }
      } finally {
        setLoadingPubs(false)
      }
    }
    loadPublications()
  }, [])

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Начните писать вашу статью...',
      }),
    ],
    editorProps: {
      attributes: {
        class: 'tiptap focus:outline-none',
      },
    },
  })

  const getPayload = useCallback(
    (status: 'draft' | 'published' | 'scheduled'): ArticlePayload => ({
      title: title || 'Без названия',
      content_markdown: editor?.getHTML() ?? '',
      visibility,
      status,
    }),
    [title, editor, visibility]
  )

  const handleSaveDraft = async () => {
    if (!selectedPubId) {
      setSaveStatus('error')
      setErrorMessage('Сначала создайте публикацию')
      return
    }
    setSaving(true)
    setSaveStatus('idle')
    setErrorMessage('')
    try {
      await api.post(`/publications/${selectedPubId}/articles`, getPayload('draft'))
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (err) {
      setSaveStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async (action: PublishAction) => {
    if (!title.trim() || !selectedPubId) return
    setPublishing(true)
    try {
      const status =
        action === 'draft' ? 'draft' : action === 'schedule' ? 'scheduled' : 'published'
      await api.post(`/publications/${selectedPubId}/articles`, getPayload(status as 'draft' | 'published' | 'scheduled'))
      // Redirect to articles list on success
      window.location.href = '/dashboard/articles'
    } catch {
      setErrorMessage('Ошибка публикации')
    } finally {
      setPublishing(false)
    }
  }

  if (loadingPubs) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <span className="text-gray-500">Загрузка...</span>
      </div>
    )
  }

  if (publications.length === 0) {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <h2 className="text-xl font-bold text-gray-200 mb-3">Нет публикаций</h2>
        <p className="text-gray-500 mb-6">
          Чтобы написать статью, сначала создайте публикацию.
        </p>
        <a
          href="/dashboard/settings"
          className="inline-block px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-colors"
        >
          Создать публикацию
        </a>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <a
            href="/dashboard/articles"
            className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            &larr; Статьи
          </a>
          {publications.length > 1 && (
            <select
              value={selectedPubId}
              onChange={(e) => setSelectedPubId(e.target.value)}
              className="text-sm bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-gray-300"
            >
              {publications.map((pub) => (
                <option key={pub.id} value={pub.id}>
                  {pub.name}
                </option>
              ))}
            </select>
          )}
          {saveStatus === 'saved' && (
            <span className="text-xs text-emerald-400">Сохранено</span>
          )}
          {saveStatus === 'error' && (
            <span className="text-xs text-red-400">{errorMessage || 'Ошибка сохранения'}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            isLoading={saving}
            onClick={handleSaveDraft}
          >
            Сохранить черновик
          </Button>
          <div className="flex items-center">
            <Button
              variant="primary"
              size="sm"
              isLoading={publishing}
              onClick={() => handlePublish('publish')}
              disabled={!title.trim()}
            >
              Опубликовать
            </Button>
            <button
              type="button"
              onClick={() => setShowSchedule(!showSchedule)}
              className="ml-0.5 px-2 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm rounded-r-lg border-l border-indigo-600 transition-colors"
              title="Запланировать"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Schedule panel */}
      {showSchedule && (
        <div className="mb-4 rounded-lg border border-gray-800 bg-gray-900 p-4 flex items-center gap-4">
          <div className="flex-1">
            <Input
              label="Дата и время публикации"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePublish('schedule')}
            disabled={!scheduledAt || !title.trim()}
          >
            Запланировать
          </Button>
        </div>
      )}

      {/* Article card */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
        {/* Title */}
        <div className="px-8 pt-8 pb-4 border-b border-gray-800">
          <textarea
            placeholder="Заголовок статьи"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            rows={1}
            className="w-full bg-transparent text-3xl font-bold text-gray-100 placeholder-gray-700 resize-none focus:outline-none leading-tight"
            onInput={(e) => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = el.scrollHeight + 'px'
            }}
          />
        </div>

        {/* Visibility toggle */}
        <div className="px-8 py-3 border-b border-gray-800 flex items-center gap-4">
          <span className="text-xs text-gray-500">Доступ:</span>
          <div className="flex gap-1 p-1 rounded-lg bg-gray-800">
            <button
              type="button"
              onClick={() => setVisibility('free')}
              className={clsx(
                'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                visibility === 'free'
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'text-gray-500 hover:text-gray-300'
              )}
            >
              Бесплатная
            </button>
            <button
              type="button"
              onClick={() => setVisibility('paid')}
              className={clsx(
                'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                visibility === 'paid'
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'text-gray-500 hover:text-gray-300'
              )}
            >
              Платная
            </button>
          </div>
          {visibility === 'paid' && (
            <span className="text-xs text-amber-400/80">
              Только для платных подписчиков
            </span>
          )}
        </div>

        {/* Editor toolbar */}
        {editor && (
          <div className="px-8 py-2 border-b border-gray-800 flex flex-wrap items-center gap-1">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              active={editor.isActive('bold')}
              title="Жирный (Ctrl+B)"
            >
              <span className="font-bold text-sm">Ж</span>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              active={editor.isActive('italic')}
              title="Курсив (Ctrl+I)"
            >
              <span className="italic text-sm">К</span>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleStrike().run()}
              active={editor.isActive('strike')}
              title="Зачёркнутый"
            >
              <span className="line-through text-sm">З</span>
            </ToolbarButton>
            <div className="w-px h-5 bg-gray-700 mx-1" />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              active={editor.isActive('heading', { level: 2 })}
              title="Заголовок H2"
            >
              <span className="text-xs font-bold">H2</span>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              active={editor.isActive('heading', { level: 3 })}
              title="Заголовок H3"
            >
              <span className="text-xs font-bold">H3</span>
            </ToolbarButton>
            <div className="w-px h-5 bg-gray-700 mx-1" />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              active={editor.isActive('bulletList')}
              title="Список"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              active={editor.isActive('orderedList')}
              title="Нумерованный список"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.242 5.992h12m-12 6.003H20.24m-12 5.999h12M4.117 7.495v-3.75H2.99m1.125 3.75H2.99m1.125 0H5.24m-1.92 2.577a1.125 1.125 0 113.356 3.356L3.12 14.982a.75.75 0 00-.219.53v.35a.75.75 0 00.75.75h3m-3-6H5.24" />
              </svg>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              active={editor.isActive('blockquote')}
              title="Цитата"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleCode().run()}
              active={editor.isActive('code')}
              title="Код"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
              </svg>
            </ToolbarButton>
            <div className="w-px h-5 bg-gray-700 mx-1" />
            <ToolbarButton
              onClick={() => editor.chain().focus().undo().run()}
              title="Отменить (Ctrl+Z)"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
              </svg>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().redo().run()}
              title="Повторить (Ctrl+Y)"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
              </svg>
            </ToolbarButton>
          </div>
        )}

        {/* Editor content */}
        <div className="px-8 py-6 min-h-96">
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Word count */}
      <div className="mt-3 text-right">
        <span className="text-xs text-gray-600">
          {editor?.storage.characterCount?.words?.() ?? 0} слов
        </span>
      </div>
    </div>
  )
}
