'use client'

import { useState } from 'react'
import Link from 'next/link'

const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500'

// ログインページ（メールアドレス + パスワード）
export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [apiError, setApiError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setApiError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/ft/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const body = await res.json().catch(() => ({}))
      if (res.ok && body.id) {
        localStorage.setItem('ftUserId', body.id)
        window.location.assign('/ja')
        return
      }
      setApiError(body.error ?? `エラーが発生しました (${res.status})`)
    } catch (err) {
      setApiError(`通信エラー: ${String(err)}`)
    }
    setSubmitting(false)
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">ログイン</h1>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              メールアドレス
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">パスワード</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </div>

          {apiError && (
            <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {apiError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-sky-600 text-white py-3 rounded-lg font-semibold hover:bg-sky-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'ログイン中...' : 'ログイン'}
          </button>

          <p className="text-right">
            <Link
              href="/ja/reset-password"
              className="text-sm text-sky-600 hover:underline"
            >
              パスワードをお忘れの方はこちら
            </Link>
          </p>
        </form>

        <div className="border-t border-gray-100 mt-6 pt-5 text-center">
          <p className="text-sm text-gray-500 mb-3">アカウントをお持ちでない方</p>
          <Link
            href="/ja/register"
            className="block w-full border-2 border-sky-600 text-sky-700 py-3 rounded-lg font-semibold hover:bg-sky-50 transition-colors"
          >
            新規会員登録はこちら
          </Link>
        </div>

        <p className="text-center mt-4">
          <Link href="/ja" className="text-sm text-gray-500 hover:text-sky-700">
            ← トップに戻る
          </Link>
        </p>
      </div>
    </main>
  )
}
