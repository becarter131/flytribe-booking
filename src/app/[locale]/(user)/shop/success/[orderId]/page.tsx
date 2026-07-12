'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

interface OrderInfo {
  status: 'pending' | 'paid'
  priceJpy: number
  itemLabel: string | null
  ticketCode: string | null
}

// 決済完了ページ: チケットコードの発行を待って表示する
export default function ShopSuccessPage() {
  const { orderId } = useParams<{ locale: string; orderId: string }>()
  const [order, setOrder] = useState<OrderInfo | null>(null)
  const [copied, setCopied] = useState(false)

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

  useEffect(() => {
    // 発行済みになったら以降のポーリングは不要（表示は fetch 結果に追従）
  }, [order])

  const copyCode = async () => {
    if (!order?.ticketCode) return
    try {
      await navigator.clipboard.writeText(order.ticketCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // 非対応環境では何もしない
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md text-center">
        {!order ? (
          <p className="text-gray-500">読み込み中...</p>
        ) : order.ticketCode ? (
          <>
            <p className="text-5xl mb-4">🎫</p>
            <h1 className="text-xl font-bold text-gray-800 mb-2">
              チケットを発行しました！
            </h1>
            {order.itemLabel && (
              <p className="text-sm text-gray-500 mb-4">{order.itemLabel}</p>
            )}
            <div className="bg-sky-50 border-2 border-sky-300 rounded-xl px-4 py-4 mb-3">
              <p className="text-xs text-gray-500 mb-1">チケットコード</p>
              <p className="font-mono text-2xl font-bold text-sky-800 tracking-wider">
                {order.ticketCode}
              </p>
            </div>
            <button
              type="button"
              onClick={copyCode}
              className={`text-sm px-4 py-2 rounded-lg border mb-4 transition-colors ${
                copied
                  ? 'bg-green-50 text-green-700 border-green-300'
                  : 'text-sky-700 border-sky-300 hover:bg-sky-50'
              }`}
            >
              {copied ? '✓ コピーしました' : '📋 コードをコピー'}
            </button>
            <p className="text-xs text-gray-500 mb-6">
              講座の予約時に「チケットコード」欄へ入力してご利用ください。
              コードは大切に保管してください。
            </p>
            <Link
              href="/ja/reserve/course"
              className="inline-block bg-sky-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-sky-700"
            >
              講座の日程を予約する
            </Link>
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
