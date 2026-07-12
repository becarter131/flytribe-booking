'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Ticket {
  code: string
  label: string
  activityName: string | null
  activitySlug: string | null
  remainingUses: number
  isActive: boolean
  issuedAt: string | null
  expiresAt: string | null
  expired: boolean
}

// マイチケット: 購入済みのチケットコードと使用状況の一覧
export default function MyTicketsPage() {
  const router = useRouter()
  const [tickets, setTickets] = useState<Ticket[] | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const userId = localStorage.getItem('ftUserId')
      if (!userId) {
        router.push('/ja/login')
        return
      }
      const res = await fetch(`/api/ft/my-tickets?userId=${userId}`)
      if (res.ok) setTickets(await res.json())
      else setTickets([])
    }
    void load()
  }, [router])

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch {
      // 非対応環境では何もしない
    }
  }

  const usable = (t: Ticket) => t.isActive && t.remainingUses > 0 && !t.expired
  const dateOf = (s: string | null) =>
    s ? new Date(s).toLocaleDateString('ja-JP') : '-'

  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Link href="/ja" className="text-sm text-gray-500 hover:text-sky-700">
          ← トップに戻る
        </Link>
        <h1 className="text-2xl font-bold text-gray-800 mt-4 mb-1">🎫 マイチケット</h1>
        <p className="text-sm text-gray-500 mb-6">
          購入済み・ご利用中のチケットコード一覧です。予約時に「チケットコード」欄へ入力してご利用ください。
          受付停止などで予約が取り消された場合、チケットは自動で再利用可能になります。
        </p>

        {tickets === null ? (
          <p className="text-gray-500 text-sm text-center py-8">読み込み中...</p>
        ) : tickets.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-8 text-center">
            <p className="text-gray-500 text-sm mb-4">購入済みのチケットはありません</p>
            <Link
              href="/ja/shop"
              className="inline-block bg-sky-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-sky-700"
            >
              チケット購入ショップへ
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((t) => (
              <div
                key={t.code}
                className={`bg-white rounded-2xl p-4 shadow-md ${
                  usable(t) ? '' : 'opacity-60'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          usable(t)
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-200 text-gray-500'
                        }`}
                      >
                        {t.expired
                          ? '期限切れ'
                          : !usable(t)
                            ? '使用済み'
                            : t.remainingUses > 1
                              ? `利用可能（残り${t.remainingUses}回）`
                              : '利用可能'}
                      </span>
                      {t.activityName && (
                        <span className="text-xs text-gray-500">{t.activityName}</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 mt-1 truncate">{t.label}</p>
                    <p className="font-mono text-lg font-bold text-sky-800 tracking-wider mt-0.5">
                      {t.code}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      発行日: {dateOf(t.issuedAt)} ・ 有効期限:{' '}
                      <span className={t.expired ? 'text-red-500 font-semibold' : ''}>
                        {dateOf(t.expiresAt)}
                      </span>
                    </p>
                  </div>
                  <div className="shrink-0 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => copy(t.code)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                        copiedCode === t.code
                          ? 'bg-green-50 text-green-700 border-green-300'
                          : 'text-sky-700 border-sky-300 hover:bg-sky-50'
                      }`}
                    >
                      {copiedCode === t.code ? '✓ コピー済' : 'コピー'}
                    </button>
                    {usable(t) && t.activitySlug && (
                      <Link
                        href={`/ja/reserve/${t.activitySlug}`}
                        className="text-xs text-center bg-sky-600 text-white px-3 py-1.5 rounded-lg hover:bg-sky-700"
                      >
                        予約する
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
