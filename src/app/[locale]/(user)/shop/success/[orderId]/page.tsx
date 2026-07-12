'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

interface OrderInfo {
  status: 'pending' | 'paid'
  priceJpy: number
  itemLabel: string | null
  ticketCodes: string[]
}

// 決済完了ページ: チケットコードの発行を待って表示する（セットは枚数分のコード）
export default function ShopSuccessPage() {
  const { orderId } = useParams<{ locale: string; orderId: string }>()
  const [order, setOrder] = useState<OrderInfo | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const fetchOrder = useCallback(async () => {
    const res = await fetch(`/api/ft/shop/orders/${orderId}`)
    if (res.ok) setOrder(await res.json())
  }, [orderId])

  // Webhook 処理完了までポーリング（最大30秒）
  useEffect(() => {
    let tries = 0
    let timer: ReturnType<typeof setInterval> | null = null
    const start = async () => {
      await fetchOrder()
      timer = setInterval(async () => {
        tries++
        if (tries > 15) {
          if (timer) clearInterval(timer)
          return
        }
        await fetchOrder()
      }, 2000)
    }
    void start()
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [fetchOrder])

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedCode(key)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch {
      // 非対応環境では何もしない
    }
  }

  const codes = order?.ticketCodes ?? []

  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md text-center">
        {!order ? (
          <p className="text-gray-500">読み込み中...</p>
        ) : codes.length > 0 ? (
          <>
            <p className="text-5xl mb-4">🎫</p>
            <h1 className="text-xl font-bold text-gray-800 mb-2">
              {codes.length > 1
                ? `チケットを${codes.length}枚発行しました！`
                : 'チケットを発行しました！'}
            </h1>
            {order.itemLabel && (
              <p className="text-sm text-gray-500 mb-4">{order.itemLabel}</p>
            )}
            <div className="space-y-2 mb-3">
              {codes.map((code, i) => (
                <div
                  key={code}
                  className="bg-sky-50 border-2 border-sky-300 rounded-xl px-4 py-3 flex items-center justify-between gap-2"
                >
                  <div className="text-left">
                    {codes.length > 1 && (
                      <p className="text-xs text-gray-500">{i + 1}枚目</p>
                    )}
                    <p className="font-mono text-lg font-bold text-sky-800 tracking-wider">
                      {code}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copy(code, code)}
                    className={`shrink-0 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                      copiedCode === code
                        ? 'bg-green-50 text-green-700 border-green-300'
                        : 'text-sky-700 border-sky-300 hover:bg-sky-50'
                    }`}
                  >
                    {copiedCode === code ? '✓ コピー済' : 'コピー'}
                  </button>
                </div>
              ))}
            </div>
            {codes.length > 1 && (
              <button
                type="button"
                onClick={() => copy(codes.join('\n'), '__all__')}
                className={`text-sm px-4 py-2 rounded-lg border mb-4 transition-colors ${
                  copiedCode === '__all__'
                    ? 'bg-green-50 text-green-700 border-green-300'
                    : 'text-sky-700 border-sky-300 hover:bg-sky-50'
                }`}
              >
                {copiedCode === '__all__' ? '✓ コピーしました' : '📋 全コードをまとめてコピー'}
              </button>
            )}
            <p className="text-xs text-gray-500 mb-6">
              予約時に「チケットコード」欄へ1枚分のコードを入力してご利用ください。
              {codes.length > 1 && 'コードは1枚ずつ別の方に渡してお使いいただけます。'}
              発行済みのコードは「マイチケット」からいつでも確認できます。
            </p>
            <div className="flex flex-col gap-2">
              <Link
                href="/ja/tickets"
                className="inline-block bg-sky-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-sky-700"
              >
                マイチケットを見る
              </Link>
              <Link href="/ja" className="text-sm text-gray-500 hover:text-sky-700 py-1">
                トップに戻る
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="text-5xl mb-4">⏳</p>
            <h1 className="text-xl font-bold text-gray-800 mb-2">
              決済を確認しています...
            </h1>
            <p className="text-sm text-gray-500">
              チケットコードの発行まで少々お待ちください（自動で更新されます）
            </p>
          </>
        )}
      </div>
    </main>
  )
}
