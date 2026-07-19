'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

interface RequestDetail {
  userName: string | null
  userEmail: string | null
  userPhone: string | null
  partySize: number
  couponCodes: string[]
  createdAt: string
  status: 'active' | 'rejected'
}

interface FtAdminRow {
  activityId: string
  activitySlug: string
  activityName: string
  date: string
  count: number
  minParticipants: number
  state: 'blank' | 'tentative' | 'confirmed' | 'rejected'
  requests: RequestDetail[]
}

const STATE_LABEL: Record<string, { label: string; color: string }> = {
  tentative: { label: '仮予約', color: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: '確定', color: 'bg-green-100 text-green-800' },
  rejected: { label: '受付停止', color: 'bg-red-100 text-red-800' },
  occupied: { label: '埋まり', color: 'bg-gray-200 text-gray-600' },
  blank: { label: '空き', color: 'bg-gray-100 text-gray-600' },
}

interface FtCoupon {
  id: string
  code: string
  description: string | null
  activityName: string
  remainingUses: number
  isActive: boolean
  issuedAt: string | null
  expiresAt: string | null
  expired: boolean
}

interface CalActivity {
  id: string
  slug: string
  name: string
  minParticipants: number
}

type CalState = 'blank' | 'tentative' | 'confirmed' | 'rejected' | 'occupied'
interface CalDayInfo {
  count: number
  state: CalState
}

interface AdminProfile {
  id: string
  name: string
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']
const CAL_DOT: Record<CalState, string> = {
  blank: 'bg-gray-200',
  tentative: 'bg-yellow-400',
  confirmed: 'bg-green-500',
  rejected: 'bg-red-500',
  occupied: 'bg-gray-400',
}

// カレンダーの「申込数/催行人数」表示の文字色（状態と同じ色分け）
const CAL_TEXT: Record<CalState, string> = {
  blank: 'text-gray-500',
  tentative: 'text-yellow-600',
  confirmed: 'text-green-600',
  rejected: 'text-red-500',
  occupied: 'text-gray-400',
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const unitOf = (slug: string) => (slug === 'charter' ? '社' : '名')

interface AdminListRow {
  id: string
  name: string
  email: string
  isActive: boolean
  isOwner: boolean
  hasPassword: boolean
}

interface InviteRow {
  id: string
  code: string
  expiresAt: string
  usedAt: string | null
  usedByName: string | null
}

export default function DashboardPage() {
  // password = 認証クレデンシャル（管理者セッショントークン or オーナーパスワード）
  const [password, setPassword] = useState<string | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)
  const [rows, setRows] = useState<FtAdminRow[]>([])
  const [sessionChecked, setSessionChecked] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  // ログイン画面のモードと入力
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'owner'>('login')
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [ownerPasswordInput, setOwnerPasswordInput] = useState('')
  // 2段階認証（メールOTP）
  const [otpStep, setOtpStep] = useState(false)
  const [otpCode, setOtpCode] = useState('')

  // 管理者アカウント（ログイン後に保持）
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null)
  const [regInviteCode, setRegInviteCode] = useState('')
  const [regName, setRegName] = useState('')
  const [regBirthdate, setRegBirthdate] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regError, setRegError] = useState<string | null>(null)

  // オーナーパネル（招待コード・管理者一覧）
  const [invites, setInvites] = useState<InviteRow[]>([])
  const [adminList, setAdminList] = useState<AdminListRow[]>([])

  const [coupons, setCoupons] = useState<FtCoupon[]>([])
  const [couponDesc, setCouponDesc] = useState('')
  const [couponUses, setCouponUses] = useState(10)
  const [hideUsedUp, setHideUsedUp] = useState(false)

  // カレンダー管理
  const now = new Date()
  const [calYear, setCalYear] = useState(now.getFullYear())
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1)
  const [calActivities, setCalActivities] = useState<CalActivity[]>([])
  const [calDays, setCalDays] = useState<Record<string, Record<string, CalDayInfo>>>({})
  const [calSelected, setCalSelected] = useState<string | null>(null)
  const [calBusy, setCalBusy] = useState(false)

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
    if (res.ok) {
      setRows(await res.json())
      const cRes = await fetch('/api/admin/ft/coupons', {
        headers: { Authorization: `Bearer ${pw}` },
      })
      if (cRes.ok) setCoupons(await cRes.json())
    }
    return res.ok
  }, [])

  const fetchCalendar = useCallback(async () => {
    const res = await fetch(`/api/ft/calendar?year=${calYear}&month=${calMonth}`)
    if (!res.ok) return
    const body = await res.json()
    setCalActivities(body.activities ?? [])
    setCalDays(body.days ?? {})
  }, [calYear, calMonth])

  useEffect(() => {
    const restore = async () => {
      const savedProfile = localStorage.getItem('ftAdminProfile')
      if (savedProfile) {
        try {
          setAdminProfile(JSON.parse(savedProfile))
        } catch {
          localStorage.removeItem('ftAdminProfile')
        }
      }
      const saved = sessionStorage.getItem('adminPassword')
      const ok = await fetchRows(saved)
      if (ok && saved) {
        setPassword(saved)
        setIsOwner(sessionStorage.getItem('ftIsOwner') === '1')
      }
      setSessionChecked(true)
    }
    void restore()
  }, [fetchRows])

  // オーナーパネル用データの取得
  const fetchOwnerPanel = useCallback(async (pw: string) => {
    const [iRes, aRes] = await Promise.all([
      fetch('/api/admin/ft/invites', { headers: { Authorization: `Bearer ${pw}` } }),
      fetch('/api/admin/ft/admins', { headers: { Authorization: `Bearer ${pw}` } }),
    ])
    if (iRes.ok) setInvites(await iRes.json())
    if (aRes.ok) setAdminList(await aRes.json())
  }, [])

  useEffect(() => {
    if (!password || !isOwner) return
    const load = async () => {
      await fetchOwnerPanel(password)
    }
    void load()
  }, [password, isOwner, fetchOwnerPanel])

  useEffect(() => {
    if (!password) return
    const load = async () => {
      await fetchCalendar()
    }
    void load()
  }, [password, fetchCalendar])

  // ログイン成功後の共通処理
  const startSession = async (credential: string, profile: AdminProfile, owner: boolean) => {
    sessionStorage.setItem('adminPassword', credential)
    sessionStorage.setItem('ftIsOwner', owner ? '1' : '0')
    localStorage.setItem('ftAdminProfile', JSON.stringify(profile))
    setAdminProfile(profile)
    setIsOwner(owner)
    await fetchRows(credential)
    setPassword(credential)
  }

  // 管理者ログイン 第1段階（メール+パスワード → 確認コードをメール送信）
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError(null)
    setSubmitting(true)
    const res = await fetch('/api/admin/ft/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: loginEmail.trim(), password: loginPassword }),
    })
    const body = await res.json().catch(() => ({}))
    if (res.ok && body.otpRequired) {
      setOtpStep(true)
      setOtpCode('')
    } else {
      setLoginError(body.error ?? 'ログインに失敗しました')
    }
    setSubmitting(false)
  }

  // 管理者ログイン 第2段階（メールの確認コード → セッショントークン）
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError(null)
    setSubmitting(true)
    const res = await fetch('/api/admin/ft/login/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: loginEmail.trim(), code: otpCode.trim() }),
    })
    const body = await res.json().catch(() => ({}))
    if (res.ok && body.token) {
      // オーナーフラグ付き管理者はそのままオーナーとして扱う
      await startSession(body.token, { id: body.id, name: body.name }, body.isOwner === true)
    } else {
      setLoginError(body.error ?? '確認コードの検証に失敗しました')
    }
    setSubmitting(false)
  }

  // オーナーログイン（環境変数のオーナーパスワード）
  const handleOwnerLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError(null)
    setSubmitting(true)
    const ok = await fetchRows(ownerPasswordInput)
    if (ok) {
      await startSession(ownerPasswordInput, { id: 'owner', name: 'オーナー' }, true)
    } else {
      setLoginError('オーナーパスワードが違います')
    }
    setSubmitting(false)
  }

  // 新規管理者登録（オーナー発行の招待コードが必須）
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setRegError(null)
    if (
      !regInviteCode.trim() ||
      !regName.trim() ||
      !regBirthdate ||
      !regPhone.trim() ||
      !regEmail.trim() ||
      regPassword.length < 8
    ) {
      setRegError('すべての項目を入力してください（パスワードは8文字以上）')
      return
    }
    setSubmitting(true)
    const res = await fetch('/api/admin/ft/admins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inviteCode: regInviteCode.trim(),
        name: regName.trim(),
        birthdate: regBirthdate,
        phone: regPhone.trim(),
        email: regEmail.trim(),
        password: regPassword,
      }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      setRegError(body.error ?? `エラーが発生しました (${res.status})`)
    } else {
      await startSession(body.token, { id: body.id, name: body.name }, body.isOwner === true)
    }
    setSubmitting(false)
  }

  // 招待コード発行（オーナー専用）
  const issueInvite = async () => {
    if (!password) return
    setActionError(null)
    const res = await fetch('/api/admin/ft/invites', {
      method: 'POST',
      headers: { Authorization: `Bearer ${password}` },
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      setActionError(body.error ?? `エラーが発生しました (${res.status})`)
    } else {
      await fetchOwnerPanel(password)
    }
  }

  // 管理者の有効化/無効化・オーナー権限の付与/解除（オーナー専用）
  const patchAdmin = async (admin: AdminListRow, change: { isActive?: boolean; isOwner?: boolean }) => {
    if (!password) return
    if (
      change.isActive === false &&
      !confirm(`${admin.name} さんを無効化します。以後ログインできなくなります。よろしいですか？`)
    ) {
      return
    }
    if (
      change.isOwner !== undefined &&
      !confirm(
        change.isOwner
          ? `${admin.name} さんにオーナー権限を付与します。招待コード発行や管理者の管理ができるようになります。よろしいですか？`
          : `${admin.name} さんのオーナー権限を解除します。よろしいですか？`
      )
    ) {
      return
    }
    setActionError(null)
    const res = await fetch('/api/admin/ft/admins', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${password}`,
      },
      body: JSON.stringify({ adminId: admin.id, ...change }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setActionError(body.error ?? `エラーが発生しました (${res.status})`)
    }
    await fetchOwnerPanel(password)
  }

  const logout = () => {
    sessionStorage.removeItem('adminPassword')
    sessionStorage.removeItem('ftIsOwner')
    localStorage.removeItem('ftAdminProfile')
    window.location.reload()
  }

  const patchStatus = async (
    activityId: string,
    date: string,
    operatorStatus: 'approved' | 'rejected' | 'none',
    scope: 'activity' | 'date'
  ) => {
    if (!password) return false
    const res = await fetch('/api/admin/ft', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${password}`,
      },
      body: JSON.stringify({ activityId, date, operatorStatus, scope }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setActionError(body.error ?? `エラーが発生しました (${res.status})`)
      return false
    }
    return true
  }

  // 確定・受付停止の前に最終確認のポップアップを出す
  const confirmStatusChange = (
    date: string,
    activityName: string,
    operatorStatus: 'approved' | 'rejected' | 'none',
    scope: 'activity' | 'date'
  ): boolean => {
    if (operatorStatus === 'approved') {
      return confirm(
        `${date} の「${activityName}」を予約確定にします。よろしいですか？\n（申込者全員へ確定の通知が送られます）`
      )
    }
    if (operatorStatus === 'rejected') {
      return scope === 'date'
        ? confirm(
            `${date} を受付停止にします。よろしいですか？\n（3種類すべての利用区分が受付停止になり、この日の申込はすべて取り消され、使用されたチケットは返却されます）`
          )
        : confirm(
            `${date} の「${activityName}」を受付停止にします。よろしいですか？\n（この区分の申込のみ取り消され、使用されたチケットは返却されます。他の区分には影響しません）`
          )
    }
    if (operatorStatus === 'none') {
      return scope === 'date'
        ? confirm(
            `${date} の受付停止を取り消します。よろしいですか？\n（全区分の受付停止が解除されます。取り消された申込は元に戻りません）`
          )
        : confirm(
            `${date} の「${activityName}」の受付停止を取り消します。よろしいですか？\n（取り消された申込は元に戻りません）`
          )
    }
    return true
  }

  // 予約一覧: 申し込み（区分×日付）単位で操作する。他の区分には影響しない
  const updateStatus = async (
    row: FtAdminRow,
    operatorStatus: 'approved' | 'rejected' | 'none'
  ) => {
    if (!confirmStatusChange(row.date, row.activityName, operatorStatus, 'activity')) return
    setActionError(null)
    await patchStatus(row.activityId, row.date, operatorStatus, 'activity')
    fetchRows(password)
    fetchCalendar()
  }

  const calSetStatus = async (
    activityId: string,
    operatorStatus: 'approved' | 'rejected' | 'none'
  ) => {
    if (!calSelected) return
    const activityName =
      calActivities.find((a) => a.id === activityId)?.name ?? '利用区分'
    if (!confirmStatusChange(calSelected, activityName, operatorStatus, 'activity')) return
    setActionError(null)
    setCalBusy(true)
    await patchStatus(activityId, calSelected, operatorStatus, 'activity')
    await fetchCalendar()
    fetchRows(password)
    setCalBusy(false)
  }

  // カレンダー管理: 日付単位（全区分一括）で受付停止する
  const calStopDay = async () => {
    if (!calSelected || calActivities.length === 0) return
    if (!confirmStatusChange(calSelected, '', 'rejected', 'date')) return
    setActionError(null)
    setCalBusy(true)
    await patchStatus(calActivities[0].id, calSelected, 'rejected', 'date')
    await fetchCalendar()
    fetchRows(password)
    setCalBusy(false)
  }

  const calLiftDay = async () => {
    if (!calSelected || calActivities.length === 0) return
    if (!confirmStatusChange(calSelected, '', 'none', 'date')) return
    setActionError(null)
    setCalBusy(true)
    await patchStatus(calActivities[0].id, calSelected, 'none', 'date')
    await fetchCalendar()
    fetchRows(password)
    setCalBusy(false)
  }

  const createCoupon = async () => {
    if (!password) return
    setActionError(null)
    const res = await fetch('/api/admin/ft/coupons', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${password}`,
      },
      body: JSON.stringify({ description: couponDesc || undefined, uses: couponUses }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setActionError(body.error ?? `エラーが発生しました (${res.status})`)
    } else {
      setCouponDesc('')
    }
    fetchRows(password)
  }

  const toggleCoupon = async (coupon: FtCoupon) => {
    if (!password) return
    await fetch('/api/admin/ft/coupons', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${password}`,
      },
      body: JSON.stringify({ couponId: coupon.id, isActive: !coupon.isActive }),
    })
    fetchRows(password)
  }

  const calPrevMonth = () => {
    if (calMonth === 1) {
      setCalYear((y) => y - 1)
      setCalMonth(12)
    } else {
      setCalMonth((m) => m - 1)
    }
    setCalSelected(null)
  }
  const calNextMonth = () => {
    if (calMonth === 12) {
      setCalYear((y) => y + 1)
      setCalMonth(1)
    } else {
      setCalMonth((m) => m + 1)
    }
    setCalSelected(null)
  }

  if (!sessionChecked) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">読み込み中...</p>
      </main>
    )
  }

  if (!password) {
    const inputCls =
      'w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500'
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
          {/* モード切替タブ */}
          <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 text-sm">
            {(
              [
                ['login', 'ログイン'],
                ['register', '新規登録'],
                ['owner', 'オーナー用'],
              ] as const
            ).map(([m, label]) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setAuthMode(m)
                  setLoginError(null)
                  setRegError(null)
                }}
                className={`flex-1 py-1.5 rounded-md font-medium ${
                  authMode === m ? 'bg-white shadow text-sky-700' : 'text-gray-500'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {authMode === 'login' && otpStep && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <h1 className="text-xl font-bold text-gray-800">確認コードの入力</h1>
              <p className="text-sm text-gray-500">
                {loginEmail} に確認コードを送信しました（10分間有効）。メールに記載の6桁の数字を入力してください。
              </p>
              <input
                type="text"
                inputMode="numeric"
                required
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className={`${inputCls} text-center text-lg tracking-[0.5em] font-mono`}
              />
              {loginError && <p className="text-red-500 text-sm">{loginError}</p>}
              <button
                type="submit"
                disabled={submitting || otpCode.length !== 6}
                className="w-full bg-sky-600 text-white py-2 rounded-lg font-semibold hover:bg-sky-700 disabled:opacity-50"
              >
                ログイン
              </button>
              <button
                type="button"
                onClick={() => {
                  setOtpStep(false)
                  setLoginError(null)
                }}
                className="w-full text-sm text-gray-500 hover:text-sky-700"
              >
                ← メールアドレスの入力に戻る
              </button>
            </form>
          )}

          {authMode === 'login' && !otpStep && (
            <form onSubmit={handleLogin} className="space-y-4">
              <h1 className="text-xl font-bold text-gray-800">管理者ログイン</h1>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="メールアドレス"
                className={inputCls}
              />
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="パスワード"
                className={inputCls}
              />
              {loginError && <p className="text-red-500 text-sm">{loginError}</p>}
              <button
                type="submit"
                disabled={submitting || !loginEmail || !loginPassword}
                className="w-full bg-sky-600 text-white py-2 rounded-lg font-semibold hover:bg-sky-700 disabled:opacity-50"
              >
                確認コードを送信
              </button>
              <p className="text-right">
                <Link
                  href="/ja/reset-password?kind=admin"
                  className="text-sm text-sky-600 hover:underline"
                >
                  パスワードをお忘れの方はこちら
                </Link>
              </p>
            </form>
          )}

          {authMode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3">
              <h1 className="text-xl font-bold text-gray-800">管理者アカウント登録</h1>
              <p className="text-sm text-gray-500">
                オーナーから受け取った招待コードが必要です（すべて必須）。
              </p>
              <div>
                <label className="block text-sm text-gray-600 mb-1">招待コード</label>
                <input
                  type="text"
                  required
                  value={regInviteCode}
                  onChange={(e) => setRegInviteCode(e.target.value)}
                  placeholder="8桁の英数字"
                  className={`${inputCls} font-mono`}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">氏名</label>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="山田 太郎"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">生年月日</label>
                <input
                  type="date"
                  required
                  value={regBirthdate}
                  onChange={(e) => setRegBirthdate(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">電話番号</label>
                <input
                  type="tel"
                  required
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="090-0000-0000"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">メールアドレス</label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">パスワード（8文字以上）</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className={inputCls}
                />
              </div>
              {regError && <p className="text-red-500 text-sm">{regError}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-sky-600 text-white py-2 rounded-lg font-semibold hover:bg-sky-700 disabled:opacity-50"
              >
                登録して管理画面へ
              </button>
            </form>
          )}

          {authMode === 'owner' && (
            <form onSubmit={handleOwnerLogin} className="space-y-4">
              <h1 className="text-xl font-bold text-gray-800">オーナー用ログイン</h1>
              <p className="text-sm text-gray-500">
                オーナー専用のログインです。オーナーパスワードをお持ちの方のみご利用いただけます（オーナーの方も、普段はメールアドレスでのログインで構いません）。
              </p>
              <input
                type="password"
                required
                value={ownerPasswordInput}
                onChange={(e) => setOwnerPasswordInput(e.target.value)}
                placeholder="オーナーパスワード"
                className={inputCls}
              />
              {loginError && <p className="text-red-500 text-sm">{loginError}</p>}
              <button
                type="submit"
                disabled={submitting || !ownerPasswordInput}
                className="w-full bg-sky-600 text-white py-2 rounded-lg font-semibold hover:bg-sky-700 disabled:opacity-50"
              >
                ログイン
              </button>
            </form>
          )}
        </div>
      </main>
    )
  }

  // カレンダーグリッド
  const first = new Date(calYear, calMonth - 1, 1)
  const daysInMonth = new Date(calYear, calMonth, 0).getDate()
  const cells: (Date | null)[] = [
    ...Array.from({ length: first.getDay() }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(calYear, calMonth - 1, i + 1)),
  ]
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">フライトライブ 予約管理</h1>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <Link href="/ja/dashboard/spec" className="text-sky-600 hover:underline">
              📘 {isOwner ? '総合仕様書' : '運用マニュアル'}
            </Link>
            <span>
              {isOwner ? '👑 オーナー' : `管理者: ${adminProfile?.name ?? ''}`}
            </span>
            <button type="button" onClick={logout} className="underline hover:text-red-600">
              ログアウト
            </button>
          </div>
        </div>

        {actionError && (
          <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
            {actionError}
          </p>
        )}

        {/* オーナーパネル: 招待コード発行・管理者管理 */}
        {isOwner && (
          <div className="bg-white rounded-2xl shadow p-5 mb-8 border-2 border-amber-200">
            <h2 className="text-lg font-bold text-gray-800 mb-4">👑 オーナー管理</h2>

            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-700 text-sm">管理者招待コード（使い捨て・7日有効）</h3>
              <button
                type="button"
                onClick={issueInvite}
                className="text-sm bg-amber-500 text-white px-3 py-1.5 rounded-lg hover:bg-amber-600"
              >
                ＋ 招待コードを発行
              </button>
            </div>
            <ul className="space-y-1 mb-6">
              {invites.map((i) => {
                const expired = !i.usedAt && new Date(i.expiresAt) < new Date()
                return (
                  <li
                    key={i.id}
                    className="flex items-center justify-between text-sm border border-gray-200 rounded-lg px-3 py-2"
                  >
                    <span className={`font-mono font-bold ${i.usedAt || expired ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                      {i.code}
                    </span>
                    <span className="text-xs text-gray-500">
                      {i.usedAt
                        ? `使用済み（${i.usedByName ?? '不明'}）`
                        : expired
                          ? '期限切れ'
                          : `${new Date(i.expiresAt).toLocaleDateString('ja-JP')} まで有効`}
                    </span>
                  </li>
                )
              })}
              {invites.length === 0 && (
                <li className="text-sm text-gray-400">発行済みの招待コードはありません</li>
              )}
            </ul>

            <h3 className="font-semibold text-gray-700 text-sm mb-2">管理者一覧</h3>
            <ul className="space-y-1">
              {adminList.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-2 text-sm border border-gray-200 rounded-lg px-3 py-2"
                >
                  <span className={a.isActive ? 'text-gray-800' : 'text-gray-400'}>
                    {a.isOwner && <span className="mr-1">👑</span>}
                    {a.name}（{a.email}）
                    {!a.hasPassword && (
                      <span className="text-xs text-amber-600 ml-1">旧方式・要再登録</span>
                    )}
                    {!a.isActive && <span className="text-xs text-red-500 ml-1">無効</span>}
                  </span>
                  <span className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => patchAdmin(a, { isOwner: !a.isOwner })}
                      className="text-xs px-2 py-1 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100"
                    >
                      {a.isOwner ? '👑解除' : '👑付与'}
                    </button>
                    <button
                      type="button"
                      onClick={() => patchAdmin(a, { isActive: !a.isActive })}
                      className={`text-xs px-2 py-1 rounded-lg ${
                        a.isActive
                          ? 'bg-red-50 text-red-600 hover:bg-red-100'
                          : 'bg-green-50 text-green-700 hover:bg-green-100'
                      }`}
                    >
                      {a.isActive ? '無効化' : '有効化'}
                    </button>
                  </span>
                </li>
              ))}
              {adminList.length === 0 && (
                <li className="text-sm text-gray-400">登録済みの管理者はいません</li>
              )}
            </ul>
          </div>
        )}

        {/* 予約一覧（申込内容の詳細つき） */}
        <h2 className="text-xl font-bold text-gray-800 mb-1">予約一覧</h2>
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
          ⚠️ 同じ日付の申し込みが複数ある場合、いずれか1件を承認した時点で、残りの申し込みは必ず受付停止にしてください。
          <br />
          受付停止にしない場合、承認されなかったお客様にチケットが返却されず、クレームにつながるおそれがあります。
        </p>
        <div className="space-y-3">
          {rows.map((row) => {
            const s = STATE_LABEL[row.state] ?? STATE_LABEL.blank
            const unit = unitOf(row.activitySlug)
            const isStopped = row.state === 'rejected'
            return (
              <div
                key={`${row.activityId}-${row.date}`}
                className={`rounded-2xl shadow p-4 ${isStopped ? 'bg-gray-100 opacity-70' : 'bg-white'}`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.color}`}>
                        {s.label}
                      </span>
                      <span className="font-mono text-sm text-gray-500">{row.date}</span>
                    </div>
                    <p className="font-semibold text-gray-800">{row.activityName}</p>
                    <p className="text-sm text-gray-600">
                      予約 {row.count}
                      {unit}
                      {row.minParticipants > 1 && ` / 確定は ${row.minParticipants}${unit}〜`}
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
                        className="text-sm bg-gray-600 text-white px-3 py-1 rounded-lg hover:bg-gray-700"
                      >
                        受付停止を取り消す
                      </button>
                    )}
                  </div>
                </div>

                {/* 申込内容の詳細 */}
                {row.requests.length > 0 && (
                  <div className="mt-3 border-t border-gray-100 pt-3">
                    <p className="text-xs font-semibold text-gray-500 mb-2">
                      申込内容（{row.requests.length}件）
                    </p>
                    <ul className="space-y-1">
                      {row.requests.map((r, i) => (
                        <li
                          key={i}
                          className={`text-sm flex flex-wrap items-center gap-x-3 gap-y-0.5 ${
                            r.status === 'rejected' ? 'text-gray-400' : 'text-gray-700'
                          }`}
                        >
                          {r.status === 'rejected' && (
                            <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-gray-200 text-gray-500">
                              受付停止
                            </span>
                          )}
                          <span className="font-medium">{r.userName ?? '（不明）'}</span>
                          <span className={`text-xs ${r.status === 'rejected' ? 'text-gray-400' : 'text-gray-500'}`}>
                            {r.userEmail}
                          </span>
                          {r.userPhone && (
                            <span className={`text-xs ${r.status === 'rejected' ? 'text-gray-400' : 'text-gray-500'}`}>
                              📞 {r.userPhone}
                            </span>
                          )}
                          <span>
                            {r.partySize}
                            {unit}
                          </span>
                          {r.couponCodes.length > 0 && (
                            <span className={`font-mono text-xs ${r.status === 'rejected' ? 'text-gray-400 line-through' : 'text-sky-600'}`}>
                              {r.couponCodes.join(', ')}
                            </span>
                          )}
                          <span className="text-xs text-gray-400">
                            申込: {new Date(r.createdAt).toLocaleString('ja-JP')}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )
          })}
          {rows.length === 0 && (
            <p className="text-center text-gray-500 py-8">予約のある日はまだありません</p>
          )}
        </div>

        {/* カレンダー管理（受付停止の設定） */}
        <h2 className="text-xl font-bold text-gray-800 mt-10 mb-4">
          カレンダー管理（受付停止の設定）
        </h2>
        <p className="text-sm text-gray-500 mb-3">
          日付を選ぶと利用区分ごとの状態を確認できます。
          受付停止は日付単位で、<strong>3種類すべての利用区分</strong>が一括で停止になります。
          確定済みの日付も天候不順などの際に受付停止へ変更できます。
        </p>
        <div className="bg-white rounded-2xl shadow p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={calPrevMonth}
              className="text-gray-500 hover:text-sky-700 px-3 py-1 rounded hover:bg-sky-50"
            >
              ←
            </button>
            <p className="font-bold text-gray-800">
              {calYear}年 {calMonth}月
            </p>
            <button
              type="button"
              onClick={calNextMonth}
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
              const isPast = d < today
              const info = calDays[key]
              return (
                <button
                  key={key}
                  type="button"
                  disabled={isPast}
                  onClick={() => setCalSelected(key)}
                  className={`aspect-square rounded-lg border text-sm flex flex-col items-center justify-center gap-0.5 transition-colors ${
                    isPast
                      ? 'bg-gray-100 text-gray-300 border-gray-100 cursor-not-allowed'
                      : 'bg-white hover:bg-sky-50 text-gray-700 border-gray-200'
                  } ${calSelected === key ? 'ring-2 ring-sky-500' : ''}`}
                >
                  <span className="font-medium">{d.getDate()}</span>
                  {!isPast && (
                    <>
                      {/* 申込のある区分は 申込数/催行人数 を表示（色は状態） */}
                      {calActivities
                        .filter((a) => (info?.[a.slug]?.count ?? 0) > 0)
                        .map((a) => {
                          const ci = info![a.slug]
                          return (
                            <span
                              key={a.slug}
                              className={`text-[9px] leading-none font-mono font-semibold ${CAL_TEXT[ci.state]}`}
                            >
                              {ci.count}/{a.minParticipants}
                            </span>
                          )
                        })}
                      {/* 申込のない区分は従来どおり状態の点 */}
                      <span className="flex gap-0.5">
                        {calActivities
                          .filter((a) => (info?.[a.slug]?.count ?? 0) === 0)
                          .map((a) => (
                            <span
                              key={a.slug}
                              className={`w-1.5 h-1.5 rounded-full ${
                                CAL_DOT[info?.[a.slug]?.state ?? 'blank']
                              }`}
                            />
                          ))}
                      </span>
                    </>
                  )}
                </button>
              )
            })}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            申込のある区分は「申込数/催行人数」を表示（上から
            {calActivities.map((a) => a.name).join('・')}の順）。
            ●は申込のない区分の状態。色: 灰=空き / 黄=仮予約 / 緑=確定 / 赤=受付停止 / 濃灰=埋まり
          </p>
        </div>

        {calSelected && (
          <div className="bg-white rounded-2xl shadow p-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">
                <span className="text-sky-700">{calSelected}</span> の状態
              </h3>
              {calActivities.some(
                (a) => calDays[calSelected]?.[a.slug]?.state === 'rejected'
              ) ? (
                <button
                  type="button"
                  onClick={calLiftDay}
                  disabled={calBusy}
                  className="text-sm bg-gray-500 text-white px-3 py-1.5 rounded-lg hover:bg-gray-600 disabled:opacity-50"
                >
                  受付停止を取り消す
                </button>
              ) : (
                <button
                  type="button"
                  onClick={calStopDay}
                  disabled={calBusy}
                  className="text-sm bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  この日を受付停止にする（全区分）
                </button>
              )}
            </div>
            <div className="space-y-2">
              {calActivities.map((a) => {
                const info = calDays[calSelected]?.[a.slug]
                const state: CalState = info?.state ?? 'blank'
                const s = STATE_LABEL[state] ?? STATE_LABEL.blank
                const unit = unitOf(a.slug)
                return (
                  <div
                    key={a.slug}
                    className="flex items-center justify-between gap-3 border border-gray-200 rounded-lg px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${s.color}`}
                      >
                        {s.label}
                      </span>
                      <span className="text-sm text-gray-700 truncate">{a.name}</span>
                      {(info?.count ?? 0) > 0 && (
                        <span className="text-xs text-gray-500 shrink-0">
                          {info!.count}
                          {unit}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {state === 'tentative' && (
                        <button
                          type="button"
                          onClick={() => calSetStatus(a.id, 'approved')}
                          disabled={calBusy}
                          className="text-xs bg-green-600 text-white px-2.5 py-1 rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                          確定にする
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* チケット管理 */}
        <div className="flex items-center justify-between mt-10 mb-4">
          <h2 className="text-xl font-bold text-gray-800">チケット管理</h2>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={hideUsedUp}
              onChange={(e) => setHideUsedUp(e.target.checked)}
              className="w-4 h-4 accent-sky-600"
            />
            残り0回のチケットを非表示
          </label>
        </div>
        <div className="bg-white rounded-2xl shadow p-4 mb-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-40">
              <label className="block text-sm text-gray-600 mb-1">説明（任意）</label>
              <input
                type="text"
                value={couponDesc}
                onChange={(e) => setCouponDesc(e.target.value)}
                placeholder="例: オープン記念 10%オフ"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">使用可能回数</label>
              <input
                type="number"
                min={1}
                max={1000}
                value={couponUses}
                onChange={(e) => setCouponUses(Number(e.target.value))}
                className="w-24 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <button
              onClick={createCoupon}
              className="bg-sky-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-sky-700"
            >
              チケットを発行
            </button>
          </div>
        </div>
        <div className="space-y-2">
          {coupons
            .filter((c) => !hideUsedUp || c.remainingUses > 0)
            .map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-2xl shadow px-4 py-3 flex items-center justify-between gap-4"
            >
              <div>
                <p className="font-mono font-bold text-gray-800">
                  {c.code}
                  {!c.isActive && (
                    <span className="text-xs font-sans font-medium bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full ml-2">
                      無効
                    </span>
                  )}
                  {c.expired && (
                    <span className="text-xs font-sans font-medium bg-red-100 text-red-600 px-2 py-0.5 rounded-full ml-2">
                      期限切れ
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {c.description ?? '（説明なし）'} · 対象: {c.activityName} · 残り{' '}
                  {c.remainingUses}回
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  発行: {c.issuedAt ? new Date(c.issuedAt).toLocaleDateString('ja-JP') : '-'}
                  {' ・ '}
                  有効期限:{' '}
                  <span className={c.expired ? 'text-red-500 font-semibold' : ''}>
                    {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('ja-JP') : '-'}
                  </span>
                </p>
              </div>
              <button
                onClick={() => toggleCoupon(c)}
                className="text-xs text-gray-500 hover:text-sky-700 underline shrink-0"
              >
                {c.isActive ? '無効にする' : '有効に戻す'}
              </button>
            </div>
          ))}
          {coupons.length === 0 && (
            <p className="text-center text-gray-500 py-4 text-sm">チケットはまだありません</p>
          )}
        </div>
      </div>
    </main>
  )
}
