'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import type { FtDateState } from '@/lib/ft'

interface DayInfo {
  count: number
  state: FtDateState
}

interface ActivityInfo {
  id: string
  slug: string
  name: string
  description: string | null
  minParticipants: number
  maxParticipants: number | null
}

interface MyRequest {
  id: string
  date: string
  partySize: number
  status: 'active' | 'cancelled'
}

const STATE_STYLE: Record<FtDateState, string> = {
  blank: 'bg-white hover:bg-sky-50 text-gray-700',
  tentative: 'bg-yellow-200 hover:bg-yellow-300 text-yellow-900',
  confirmed: 'bg-green-300 hover:bg-green-400 text-green-900',
  rejected: 'bg-red-200 text-red-800 cursor-not-allowed',
  occupied: 'bg-gray-300 text-gray-500 cursor-not-allowed',
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function ReserveCalendarPage() {
  const { slug } = useParams<{ locale: string; slug: string }>()
  const router = useRouter()

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [activity, setActivity] = useState<ActivityInfo | null>(null)
  const [days, setDays] = useState<Record<string, Record<string, DayInfo>>>({})
  const [selected, setSelected] = useState<string | null>(null)
  const [partySize, setPartySize] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [myRequests, setMyRequests] = useState<MyRequest[]>([])

  const fetchMonth = useCallback(async () => {
    const res = await fetch(`/api/ft/calendar?year=${year}&month=${month}`)
    if (!res.ok) return
    const body = await res.json()
    const act = (body.activities as ActivityInfo[]).find((a) => a.slug === slug)
    setActivity(act ?? null)
    setDays(body.days ?? {})
  }, [year, month, slug])

  const fetchMine = useCallback(async () => {
    const userId = localStorage.getItem('ftUserId')
    if (!userId) return
    const res = await fetch(`/api/ft/mine?userId=${userId}&activitySlug=${slug}`)
    if (!res.ok) return
    const body = await res.json()
    setMyRequests(body.requests ?? [])
  }, [slug])

  useEffect(() => {
    const load = async () => {
      await fetchMonth()
      await fetchMine()
    }
    void load()
  }, [fetchMonth, fetchMine])

  const prevMonth = () => {
    if (month === 1) {
      setYear((y) => y - 1)
      setMonth(12)
    } else {
      setMonth((m) => m - 1)
    }
    setSelected(null)
  }
  const nextMonth = () => {
    if (month === 12) {
      setYear((y) => y + 1)
      setMonth(1)
    } else {
      setMonth((m) => m + 1)
    }
    setSelected(null)
  }

  const submitRequest = async () => {
    if (!selected) return
    setApiError(null)
    setMessage(null)
    const userId = localStorage.getItem('ftUserId')
    if (!userId) {
      router.push('/ja/register')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/ft/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activitySlug: slug, userId, date: selected, partySize }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setApiError(body.error ?? `エラーが発生しました (${res.status})`)
      } else {
        setMessage(
          body.state === 'confirmed'
            ? `🎉 ${selected} の利用が確定しました！`
            : `✅ ${selected} で仮予約を受け付けました（現在 ${body.count} 名 / 確定は ${activity?.minParticipants} 名〜）`
        )
        setSelected(null)
        fetchMonth()
        fetchMine()
      }
    } catch (e) {
      setApiError(`通信エラー: ${String(e)}`)
    }
    setSubmitting(false)
  }

  const cancelRequest = async (requestId: string) => {
    const userId = localStorage.getItem('ftUserId')
    if (!userId) return
    if (!confirm('この予約リクエストをキャンセルしますか？')) return
    const res = await fetch('/api/ft/requests/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, userId }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      setApiError(body.error ?? `エラーが発生しました (${res.status})`)
    } else {
      setMessage('キャンセルしました')
    }
    fetchMonth()
    fetchMine()
  }

  // カレンダーグリッド
  const first = new Date(year, month - 1, 1)
  const daysInMonth = new Date(year, month, 0).getDate()
  const leadingBlanks = first.getDay()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const cells: (Date | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month - 1, i + 1)),
  ]

  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Link href="/ja" className="text-sm text-gray-500 hover:text-sky-700">
          ← 利用区分の選択に戻る
        </Link>
        <h1 className="text-2xl font-bold text-gray-800 mt-4 mb-1">
          {activity?.name ?? '読み込み中...'}
        </h1>
        {activity && (
          <p className="text-sm text-gray-500 mb-4">
            {activity.minParticipants > 1
              ? `${activity.minParticipants}名以上で開催確定`
              : 'ご予約で確定'}
            {activity.maxParticipants && `（定員 ${activity.maxParticipants}名）`}
          </p>
        )}

        {/* 凡例 */}
        <div className="flex flex-wrap gap-3 text-xs text-gray-600 mb-3">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-white border border-gray-300 inline-block" />
            空き
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-yellow-200 inline-block" />
            仮予約
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-green-300 inline-block" />
            確定
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-gray-300 inline-block" />
            埋まり（他区分で確定）
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-red-200 inline-block" />
            受付停止
          </span>
        </div>

        {/* カレンダー */}
        <div className="bg-white rounded-2xl shadow-md p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={prevMonth}
              className="text-gray-500 hover:text-sky-700 px-3 py-1 rounded hover:bg-sky-50"
            >
              ←
            </button>
            <p className="font-bold text-gray-800">
              {year}年 {month}月
            </p>
            <button
              type="button"
              onClick={nextMonth}
              className="text-gray-500 hover:text-sky-700 px-3 py-1 rounded hover:bg-sky-50"
            >
              →
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-400 mb-1">
            {WEEKDAYS.map((w) => (
              <div key={w}>{w}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (!d) return <div key={`b${i}`} />
              const key = ymd(d)
              const info = days[key]?.[slug]
              const state: FtDateState = info?.state ?? 'blank'
              const isPast = d < today
              const clickable = !isPast && state !== 'rejected' && state !== 'occupied'
              return (
                <button
                  key={key}
                  type="button"
                  disabled={!clickable}
                  onClick={() => {
                    setSelected(key)
                    setMessage(null)
                    setApiError(null)
                  }}
                  className={`aspect-square rounded-lg border text-sm flex flex-col items-center justify-center transition-colors ${
                    isPast
                      ? 'bg-gray-100 text-gray-300 border-gray-100 cursor-not-allowed'
                      : STATE_STYLE[state] + ' border-gray-200'
                  } ${selected === key ? 'ring-2 ring-sky-500' : ''}`}
                >
                  <span className="font-medium">{d.getDate()}</span>
                  {info && info.count > 0 && state !== 'occupied' && (
                    <span className="text-[10px] leading-none mt-0.5">
                      {info.count}
                      {activity && activity.minParticipants > 1
                        ? `/${activity.minParticipants}`
                        : '名'}
                    </span>
                  )}
                  {state === 'occupied' && (
                    <span className="text-[10px] leading-none mt-0.5">埋</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {message && (
          <p className="text-green-700 text-sm bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-4">
            {message}
          </p>
        )}
        {apiError && (
          <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
            {apiError}
          </p>
        )}

        {/* 予約フォーム */}
        {selected && (
          <div className="bg-white rounded-2xl shadow-md p-5 mb-4">
            <h2 className="font-semibold text-gray-800 mb-3">
              <span className="text-sky-700">{selected}</span> で予約する
            </h2>
            <div className="flex items-end gap-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">人数</label>
                <select
                  value={partySize}
                  onChange={(e) => setPartySize(Number(e.target.value))}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}名
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={submitRequest}
                disabled={submitting}
                className="flex-1 bg-sky-600 text-white py-2.5 rounded-lg font-semibold hover:bg-sky-700 disabled:opacity-50"
              >
                {submitting ? '送信中...' : '予約リクエストを送る'}
              </button>
            </div>
          </div>
        )}

        {/* 自分の予約 */}
        {myRequests.length > 0 && (
          <div className="bg-white rounded-2xl shadow-md p-5">
            <h2 className="font-semibold text-gray-800 mb-3">あなたの予約</h2>
            <ul className="space-y-2">
              {myRequests.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between text-sm border border-gray-200 rounded-lg px-3 py-2"
                >
                  <span className="text-gray-700">
                    {r.date} · {r.partySize}名 ·{' '}
                    {r.status === 'cancelled' ? 'キャンセル済み' : '受付中'}
                  </span>
                  {r.status === 'active' && (
                    <button
                      type="button"
                      onClick={() => cancelRequest(r.id)}
                      className="text-xs text-red-500 hover:text-red-700 underline shrink-0"
                    >
                      キャンセル
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  )
}
