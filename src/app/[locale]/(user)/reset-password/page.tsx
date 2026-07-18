'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500'

// パスワード再設定ページ（利用者・管理者共用）
// - token 無し: メールアドレスを入力して再設定リンクを申請（?kind=admin で管理者用）
// - token 有り: 新しいパスワードを設定
function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const kind = searchParams.get('kind') === 'admin' ? 'admin' : 'user'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [done, setDone] = useState<null | 'user' | 'admin'>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const requestReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setApiError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/ft/password-reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), kind }),
      })
      const body = await res.json().catch(() => ({}))
      if (res.ok) {
        setMessage(body.message ?? '再設定リンクをお送りしました')
      } else {
        setApiError(body.error ?? `エラーが発生しました (${res.status})`)
      }
    } catch (err) {
      setApiError(`通信エラー: ${String(err)}`)
    }
    setSubmitting(false)
  }

  const confirmReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setApiError(null)
    if (password !== password2) {
      setApiError('パスワードが一致しません')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/ft/password-reset/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const body = await res.json().catch(() => ({}))
      if (res.ok) {
        setDone(body.kind === 'admin' ? 'admin' : 'user')
      } else {
        setApiError(body.error ?? `エラーが発生しました (${res.status})`)
      }
    } catch (err) {
      setApiError(`通信エラー: ${String(err)}`)
    }
    setSubmitting(false)
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">パスワード再設定</h1>

        {done ? (
          <div className="space-y-4">
            <p className="text-green-700 text-sm bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              ✅ 新しいパスワードを設定しました。ログインし直してください。
            </p>
            <Link
              href={done === 'admin' ? '/ja/dashboard' : '/ja/login'}
              className="block w-full bg-sky-600 text-white py-3 rounded-lg font-semibold hover:bg-sky-700 text-center"
            >
              ログイン画面へ
            </Link>
          </div>
        ) : token ? (
          <form onSubmit={confirmReset} className="space-y-4">
            <p className="text-sm text-gray-500 mb-2">新しいパスワードを入力してください。</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                新しいパスワード（8文字以上）
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                新しいパスワード（確認）
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
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
              className="w-full bg-sky-600 text-white py-3 rounded-lg font-semibold hover:bg-sky-700 disabled:opacity-50"
            >
              {submitting ? '設定中...' : 'パスワードを設定する'}
            </button>
          </form>
        ) : (
          <form onSubmit={requestReset} className="space-y-4">
            <p className="text-sm text-gray-500 mb-2">
              {kind === 'admin' ? '管理者アカウントの' : 'ご'}
              登録メールアドレスを入力してください。再設定リンクをお送りします。
            </p>
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
            {message && (
              <p className="text-green-700 text-sm bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                {message}
              </p>
            )}
            {apiError && (
              <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {apiError}
              </p>
            )}
            <button
              type="submit"
              disabled={submitting || !!message}
              className="w-full bg-sky-600 text-white py-3 rounded-lg font-semibold hover:bg-sky-700 disabled:opacity-50"
            >
              {submitting ? '送信中...' : '再設定リンクを送る'}
            </button>
          </form>
        )}

        {!done && (
          <p className="text-center mt-4">
            <Link
              href={kind === 'admin' ? '/ja/dashboard' : '/ja/login'}
              className="text-sm text-gray-500 hover:text-sky-700"
            >
              ← ログイン画面に戻る
            </Link>
          </p>
        )}
      </div>
    </main>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordContent />
    </Suspense>
  )
}
