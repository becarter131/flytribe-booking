'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

// ログイン状態（ブラウザ保存の利用者ID）に応じて
// ログアウト / ログイン・新規会員登録 を出し分ける
export default function AuthButtons() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null)
  // 表示名: 法人登録なら「法人名 氏名」、個人なら「氏名」
  const [displayName, setDisplayName] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const userId = localStorage.getItem('ftUserId')
      if (!userId) {
        setLoggedIn(false)
        return
      }
      setLoggedIn(true)
      const res = await fetch(`/api/ft/users?userId=${userId}`)
      if (res.ok) {
        const user = await res.json()
        setDisplayName(user.companyName ? `${user.companyName} ${user.name}` : user.name)
      } else if (res.status === 404) {
        // アカウントが存在しない場合はログアウト扱いにする
        localStorage.removeItem('ftUserId')
        setLoggedIn(false)
      }
    }
    void load()
  }, [])

  const logout = () => {
    localStorage.removeItem('ftUserId')
    setLoggedIn(false)
    setDisplayName(null)
  }

  if (loggedIn === null) return <div className="h-10" />

  return loggedIn ? (
    <div className="flex items-center justify-end gap-3">
      <span className="text-sm text-gray-500">
        {displayName && <span className="font-semibold text-gray-700">{displayName}様 </span>}
        ログイン中
      </span>
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
        href="/ja/login"
        className="text-sm font-semibold text-white bg-sky-600 px-4 py-2 rounded-lg hover:bg-sky-700"
      >
        ログイン / 新規会員登録
      </Link>
    </div>
  )
}
