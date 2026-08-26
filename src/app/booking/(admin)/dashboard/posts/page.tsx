'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

// お知らせ/ブログの投稿管理（管理者用）
// 認証はダッシュボードと同じ sessionStorage のセッショントークンを使う

interface Post {
  id: string
  category: 'news' | 'blog'
  title: string
  body: string
  isPublished: boolean
  publishedAt: string
  createdAt: string
  updatedAt: string
}

const CATEGORY_LABEL: Record<string, string> = { news: 'お知らせ', blog: 'ブログ' }

const emptyForm = {
  category: 'news' as 'news' | 'blog',
  title: '',
  body: '',
  publishedAt: new Date().toISOString().slice(0, 10),
  isPublished: true,
}

export default function PostsAdminPage() {
  const [token, setToken] = useState<string | null>(null)
  const [checked, setChecked] = useState(false)
  const [posts, setPosts] = useState<Post[]>([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async (t: string) => {
    const res = await fetch('/api/admin/ft/posts', {
      headers: { Authorization: `Bearer ${t}` },
    })
    if (res.ok) {
      setPosts(await res.json())
    } else if (res.status === 401) {
      sessionStorage.removeItem('adminPassword')
      setToken(null)
    }
  }, [])

  useEffect(() => {
    const saved = sessionStorage.getItem('adminPassword')
    setToken(saved)
    setChecked(true)
    if (saved) void load(saved)
  }, [load])

  const startEdit = (p: Post) => {
    setEditingId(p.id)
    setForm({
      category: p.category,
      title: p.title,
      body: p.body,
      publishedAt: p.publishedAt.slice(0, 10),
      isPublished: p.isPublished,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const resetForm = () => {
    setEditingId(null)
    setForm(emptyForm)
  }

  const submit = async () => {
    if (!token || !form.title.trim() || !form.body.trim()) {
      setMessage('タイトルと本文を入力してください')
      return
    }
    setBusy(true)
    setMessage(null)
    const payload = {
      ...(editingId ? { id: editingId } : {}),
      category: form.category,
      title: form.title.trim(),
      body: form.body,
      publishedAt: form.publishedAt,
      isPublished: form.isPublished,
    }
    const res = await fetch('/api/admin/ft/posts', {
      method: editingId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    })
    setBusy(false)
    if (res.ok) {
      setMessage(editingId ? '更新しました' : '作成しました')
      resetForm()
      void load(token)
    } else {
      const data = await res.json().catch(() => null)
      setMessage(data?.error ?? '保存に失敗しました')
    }
  }

  const togglePublish = async (p: Post) => {
    if (!token) return
    await fetch('/api/admin/ft/posts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id: p.id, isPublished: !p.isPublished }),
    })
    void load(token)
  }

  const remove = async (p: Post) => {
    if (!token) return
    if (!window.confirm(`「${p.title}」を削除します。よろしいですか？`)) return
    await fetch(`/api/admin/ft/posts?id=${p.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (editingId === p.id) resetForm()
    void load(token)
  }

  if (!checked) return null

  if (!token) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow p-8 text-center">
          <p className="text-gray-700 mb-4">この機能を利用するには管理者ログインが必要です。</p>
          <Link href="/booking/dashboard" className="text-sky-600 underline">
            管理画面へ（ログイン）
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">お知らせ / ブログ管理</h1>
          <Link href="/booking/dashboard" className="text-sm text-sky-600 hover:underline">
            ← 予約管理へ戻る
          </Link>
        </div>

        {/* 投稿フォーム */}
        <section className="bg-white rounded-2xl shadow p-6 mb-8">
          <h2 className="font-bold text-gray-800 mb-4">
            {editingId ? '記事を編集' : '新しい記事を書く'}
          </h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <label className="text-sm text-gray-600">
              種別
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as 'news' | 'blog' })}
                className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
              >
                <option value="news">お知らせ</option>
                <option value="blog">ブログ</option>
              </select>
            </label>
            <label className="text-sm text-gray-600">
              表示日付
              <input
                type="date"
                value={form.publishedAt}
                onChange={(e) => setForm({ ...form, publishedAt: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </label>
          </div>
          <label className="block text-sm text-gray-600 mb-4">
            タイトル
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              maxLength={200}
              className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="例: 年末年始の営業について"
            />
          </label>
          <label className="block text-sm text-gray-600 mb-4">
            本文（改行がそのまま反映されます）
            <textarea
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              rows={10}
              className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm"
            />
          </label>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
              />
              公開する（外すと下書き保存）
            </label>
            <div className="flex items-center gap-3">
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-sm text-gray-500 underline"
                >
                  編集をやめる
                </button>
              )}
              <button
                type="button"
                onClick={submit}
                disabled={busy}
                className="bg-sky-700 text-white font-bold px-6 py-2 rounded-lg hover:bg-sky-800 disabled:opacity-50"
              >
                {busy ? '保存中...' : editingId ? '更新する' : '保存する'}
              </button>
            </div>
          </div>
          {message && <p className="text-sm text-sky-700 mt-3">{message}</p>}
        </section>

        {/* 記事一覧 */}
        <section className="space-y-3">
          {posts.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-8">まだ記事がありません。</p>
          )}
          {posts.map((p) => (
            <div key={p.id} className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center gap-2 text-xs mb-1">
                <span
                  className={`px-2 py-0.5 rounded-full font-semibold ${
                    p.category === 'news'
                      ? 'bg-sky-100 text-sky-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {CATEGORY_LABEL[p.category]}
                </span>
                <span className="text-gray-400">{p.publishedAt.slice(0, 10)}</span>
                {!p.isPublished && (
                  <span className="px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 font-semibold">
                    下書き
                  </span>
                )}
              </div>
              <p className="font-semibold text-gray-800">{p.title}</p>
              <div className="flex items-center gap-4 mt-2 text-sm">
                <button type="button" onClick={() => startEdit(p)} className="text-sky-600 underline">
                  編集
                </button>
                <button type="button" onClick={() => togglePublish(p)} className="text-gray-600 underline">
                  {p.isPublished ? '非公開にする' : '公開する'}
                </button>
                <button type="button" onClick={() => remove(p)} className="text-red-600 underline">
                  削除
                </button>
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  )
}
