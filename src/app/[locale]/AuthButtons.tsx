'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

// ログイン状態（ブラウザ保存の利用者ID）に応じて
// ログアウト / ログイン・新規会員登録 を出し分ける
export default function AuthButtons() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null)

  useEffect(() => {
    setLoggedIn(!!localStorage.getItem('ftUserId'))
  }, [])

  const logout = () => {
    localStorage.removeItem('ftUserId')
    setLoggedIn(false)
  }

  if (loggedIn === null) return <div className="h-10" />

  return loggedIn ? (
    <div className="flex items-center justify-end gap-3">
      <span className="text-sm text-gray-500">ログイン中</span>
      <button
        type="button"
        onClick={logout}
        className="text-sm text-gray-600 border border-gray-300 bg-white px-4 py-2 rounded-lg hover:bg-gray-50"
      >
        ログアウト
      </button>
    </div>
  ) : (
    <div className="flex justify-end">
      <Link
        href="/ja/register"
        className="text-sm font-semibold text-white bg-sky-600 px-4 py-2 rounded-lg hover:bg-sky-700"
      >
        ログイン / 新規会員登録
      </Link>
    </div>
  )
}
