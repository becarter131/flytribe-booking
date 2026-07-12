'use client'

import { useCallback, useEffect, useState } from 'react'

interface FtAdminRow {
  activityId: string
  activitySlug: string
  activityName: string
  date: string
  count: number
  minParticipants: number
  state: 'blank' | 'tentative' | 'confirmed' | 'rejected'
}

const STATE_LABEL: Record<string, { label: string; color: string }> = {
  tentative: { label: '仮予約', color: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: '確定', color: 'bg-green-100 text-green-800' },
  rejected: { label: '受付停止', color: 'bg-red-100 text-red-800' },
  blank: { label: '空き', color: 'bg-gray-100 text-gray-600' },
}

export default function DashboardPage() {
  const [password, setPassword] = useState<string | null>(null)
  const [passwordInput, setPasswordInput] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [rows, setRows] = useState<FtAdminRow[]>([])
  const [sessionChecked, setSessionChecked] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const fetchRows = useCallback(async (pw: string | null) => {
    if (!pw) return false
    const res = await fetch('/api/admin/ft', {
      headers: { Authorization: `Bearer ${pw}` },
    })
    if (res.status === 401) {
      sessionStorage.removeItem('adminPassword')
      setPassword(null)
      return false
    }
    if (res.ok) setRows(await res.json())
    return res.ok
  }, [])

  useEffect(() => {
    const restore = async () => {
      const saved = sessionStorage.getItem('adminPassword')
      const ok = await fetchRows(saved)
      if (ok && saved) setPassword(saved)
      setSessionChecked(true)
    }
    void restore()
  }, [fetchRows])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError(null)
    setSubmitting(true)
    const ok = await fetchRows(passwordInput)
    if (ok) {
      sessionStorage.setItem('adminPassword', passwordInput)
      setPassword(passwordInput)
    } else {
      setLoginError('パスワードが違います')
    }
    setSubmitting(false)
  }

  const updateStatus = async (
    row: FtAdminRow,
    operatorStatus: 'approved' | 'rejected' | 'none'
  ) => {
    if (!password) return
    setActionError(null)
    const res = await fetch('/api/admin/ft', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${password}`,
      },
      body: JSON.stringify({ activityId: row.activityId, date: row.date, operatorStatus }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setActionError(body.error ?? `エラーが発生しました (${res.status})`)
    }
    fetchRows(password)
  }

  if (!sessionChecked) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">読み込み中...</p>
      </main>
    )
  }

  if (!password) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <form
          onSubmit={handleLogin}
          className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm space-y-4"
        >
          <h1 className="text-xl font-bold text-gray-800">管理者ログイン</h1>
          <input
            type="password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder="管理パスワード"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          {loginError && <p className="text-red-500 text-sm">{loginError}</p>}
          <button
            type="submit"
            disabled={submitting || !passwordInput}
            className="w-full bg-sky-600 text-white py-2 rounded-lg font-semibold hover:bg-sky-700 disabled:opacity-50"
          >
            ログイン
          </button>
        </form>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          フライトライブ 予約管理
        </h1>

        {actionError && (
          <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
            {actionError}
          </p>
        )}

        <div className="space-y-3">
          {rows.map((row) => {
            const s = STATE_LABEL[row.state] ?? STATE_LABEL.blank
            return (
              <div
                key={`${row.activityId}-${row.date}`}
                className="bg-white rounded-2xl shadow p-4 flex items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.color}`}>
                      {s.label}
                    </span>
                    <span className="font-mono text-sm text-gray-500">{row.date}</span>
                  </div>
                  <p className="font-semibold text-gray-800">{row.activityName}</p>
                  <p className="text-sm text-gray-600">
                    予約 {row.count}名
                    {row.minParticipants > 1 && ` / 確定は ${row.minParticipants}名〜`}
                  </p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  {row.state !== 'confirmed' && row.state !== 'rejected' && (
                    <button
                      onClick={() => updateStatus(row, 'approved')}
                      className="text-sm bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700"
                    >
                      確定にする
                    </button>
                  )}
                  {row.state !== 'rejected' && (
                    <button
                      onClick={() => updateStatus(row, 'rejected')}
                      className="text-sm bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600"
                    >
                      受付停止にする
                    </button>
                  )}
                  {row.state === 'rejected' && (
                    <button
                      onClick={() => updateStatus(row, 'none')}
                      className="text-sm bg-gray-500 text-white px-3 py-1 rounded-lg hover:bg-gray-600"
                    >
                      停止を取り消す
                    </button>
                  )}
                </div>
              </div>
            )
          })}
          {rows.length === 0 && (
            <p className="text-center text-gray-500 py-8">予約のある日はまだありません</p>
          )}
        </div>
      </div>
    </main>
  )
}
