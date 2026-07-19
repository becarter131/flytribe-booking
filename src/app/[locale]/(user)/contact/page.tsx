'use client'

import { useState } from 'react'
import Link from 'next/link'

const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500'

// お問い合わせフォーム
export default function ContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [website, setWebsite] = useState('') // ハニーポット（bot対策・非表示）
  const [done, setDone] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setApiError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/ft/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          ...(phone.trim() && { phone: phone.trim() }),
          message: message.trim(),
          website,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (res.ok) {
        setDone(true)
      } else {
        setApiError(body.error ?? `エラーが発生しました (${res.status})`)
      }
    } catch (err) {
      setApiError(`通信エラー: ${String(err)}`)
    }
    setSubmitting(false)
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">お問い合わせ</h1>

        {done ? (
          <div className="space-y-4">
            <p className="text-green-700 text-sm bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              ✅ お問い合わせを受け付けました。受付確認のメールをお送りしましたのでご確認ください。担当者より順次ご連絡いたします。
            </p>
            <Link
              href="/ja"
              className="block w-full bg-sky-600 text-white py-3 rounded-lg font-semibold hover:bg-sky-700 text-center"
            >
              トップに戻る
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-5">
              施設のご利用・チケット・予約に関するご質問など、お気軽にお問い合わせください。
            </p>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  お名前 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="山田 太郎"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  メールアドレス <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="taro@example.com"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  電話番号（任意）
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="090-0000-0000"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  お問い合わせ内容 <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={6}
                  maxLength={4000}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className={inputClass}
                />
              </div>
              {/* ハニーポット: 人間には見えない欄。入力があれば bot として弾く */}
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="hidden"
              />

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
                {submitting ? '送信中...' : '送信する'}
              </button>
            </form>

            <p className="text-center mt-4">
              <Link href="/ja" className="text-sm text-gray-500 hover:text-sky-700">
                ← トップに戻る
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  )
}
