'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface CourseItem {
  id: string
  machine: 'multicopter' | 'helicopter'
  license: 'first' | 'second'
  experience: 'beginner' | 'experienced'
  itemType: 'basic' | 'night' | 'bvlos' | 'heavy'
  days: number | null
  priceJpy: number
}

const MACHINE_LABEL = { multicopter: 'マルチコプター', helicopter: 'ヘリコプター' } as const
const LICENSE_LABEL = { first: '一等', second: '二等' } as const
const EXPERIENCE_LABEL = { beginner: '初学者', experienced: '経験者' } as const
const OPTION_LABEL = {
  night: '夜間 限定解除',
  bvlos: '目視外 限定解除',
  heavy: '25kg以上 限定解除',
} as const

interface ShopProduct {
  id: string
  name: string
  activitySlug: 'meetup' | 'charter'
  uses: number
  priceJpy: number
}

const PRODUCT_ICON: Record<string, string> = { meetup: '🚁', charter: '🏢' }

type MachineFilter = 'all' | 'multicopter' | 'helicopter'
type LicenseFilter = 'all' | 'first' | 'second'
type ExperienceFilter = 'all' | 'beginner' | 'experienced'

type PaymentMethod = 'card' | 'bank_transfer'
// 支払い方法モーダルで扱う購入対象
type PendingPurchase =
  | { kind: 'product'; product: ShopProduct }
  | { kind: 'course'; basic: CourseItem }

// 国家資格講座チケットの購入ショップ
// 基本講習を選び、対応する限定解除をオプションとして追加購入できる
export default function ShopPage() {
  const router = useRouter()
  const [items, setItems] = useState<CourseItem[]>([])
  const [products, setProducts] = useState<ShopProduct[]>([])
  const [machine, setMachine] = useState<MachineFilter>('all')
  const [license, setLicense] = useState<LicenseFilter>('all')
  const [experience, setExperience] = useState<ExperienceFilter>('all')
  // 基本講習ごとに選択中のオプションIDを保持
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({})
  const [buyingId, setBuyingId] = useState<string | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  // 支払い方法選択モーダルの対象（null なら非表示）
  const [pending, setPending] = useState<PendingPurchase | null>(null)

  useEffect(() => {
    const load = async () => {
      const [itemsRes, productsRes] = await Promise.all([
        fetch('/api/ft/course-items'),
        fetch('/api/ft/shop/products'),
      ])
      if (itemsRes.ok) setItems(await itemsRes.json())
      if (productsRes.ok) setProducts(await productsRes.json())
    }
    void load()
  }, [])

  // 購入ボタン: 利用者登録を確認してから支払い方法モーダルを開く
  const openPayment = (target: PendingPurchase) => {
    setApiError(null)
    const userId = localStorage.getItem('ftUserId')
    if (!userId) {
      router.push('/ja/register')
      return
    }
    setPending(target)
  }

  // 支払い方法が選ばれたら Checkout セッションを作成して遷移する
  const startCheckout = async (target: PendingPurchase, paymentMethod: PaymentMethod) => {
    const userId = localStorage.getItem('ftUserId')
    if (!userId) {
      router.push('/ja/register')
      return
    }
    setPending(null)
    const buyId = target.kind === 'product' ? target.product.id : target.basic.id
    setBuyingId(buyId)
    const payload =
      target.kind === 'product'
        ? { shopProductId: target.product.id, userId, paymentMethod }
        : {
            basicItemId: target.basic.id,
            optionItemIds: selectedOptions[target.basic.id] ?? [],
            userId,
            paymentMethod,
          }
    try {
      const res = await fetch('/api/ft/shop/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setApiError(body.error ?? `エラーが発生しました (${res.status})`)
      } else if (body.checkoutUrl) {
        window.location.assign(body.checkoutUrl)
        return
      }
    } catch (e) {
      setApiError(`通信エラー: ${String(e)}`)
    }
    setBuyingId(null)
  }

  const toggleOption = (basicId: string, optionId: string) => {
    setSelectedOptions((prev) => {
      const current = prev[basicId] ?? []
      return {
        ...prev,
        [basicId]: current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId],
      }
    })
  }

  const basics = items.filter(
    (i) =>
      i.itemType === 'basic' &&
      (machine === 'all' || i.machine === machine) &&
      (license === 'all' || i.license === license) &&
      (experience === 'all' || i.experience === experience)
  )
  const optionsFor = (b: CourseItem) =>
    items.filter(
      (i) =>
        i.itemType !== 'basic' &&
        i.machine === b.machine &&
        i.license === b.license &&
        i.experience === b.experience
    )
  const totalFor = (b: CourseItem) => {
    const opts = optionsFor(b).filter((o) => (selectedOptions[b.id] ?? []).includes(o.id))
    return b.priceJpy + opts.reduce((s, o) => s + o.priceJpy, 0)
  }

  const chip = (active: boolean) =>
    `text-sm px-3 py-1.5 rounded-full border transition-colors ${
      active
        ? 'bg-sky-600 text-white border-sky-600'
        : 'bg-white text-gray-600 border-gray-300 hover:border-sky-400'
    }`

  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Link href="/ja" className="text-sm text-gray-500 hover:text-sky-700">
          ← トップに戻る
        </Link>
        <h1 className="text-2xl font-bold text-gray-800 mt-4 mb-1">チケット購入ショップ</h1>
        <p className="text-sm text-gray-500 mb-4">
          基本講習を選び、必要な限定解除をオプションとして追加できます。
          購入するとチケットコードが発行され、講座の予約時に入力してご利用いただけます。
          ※料金は全て税込 ※チケットの有効期限は発行から半年間です
        </p>

        {/* フィルター */}
        <div className="space-y-2 mb-4">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setMachine('all')} className={chip(machine === 'all')}>
              全機体
            </button>
            <button
              type="button"
              onClick={() => setMachine('multicopter')}
              className={chip(machine === 'multicopter')}
            >
              マルチコプター
            </button>
            <button
              type="button"
              onClick={() => setMachine('helicopter')}
              className={chip(machine === 'helicopter')}
            >
              ヘリコプター
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setLicense('all')} className={chip(license === 'all')}>
              一等・二等
            </button>
            <button type="button" onClick={() => setLicense('first')} className={chip(license === 'first')}>
              一等
            </button>
            <button
              type="button"
              onClick={() => setLicense('second')}
              className={chip(license === 'second')}
            >
              二等
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setExperience('all')}
              className={chip(experience === 'all')}
            >
              初学者・経験者
            </button>
            <button
              type="button"
              onClick={() => setExperience('beginner')}
              className={chip(experience === 'beginner')}
            >
              初学者
            </button>
            <button
              type="button"
              onClick={() => setExperience('experienced')}
              className={chip(experience === 'experienced')}
            >
              経験者
            </button>
          </div>
        </div>

        {apiError && (
          <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
            {apiError}
          </p>
        )}

        {/* 利用券（飛行会・貸切） */}
        {products.length > 0 && (
          <>
            <h2 className="font-bold text-gray-700 mb-2">利用券</h2>
            <div className="space-y-3 mb-6">
              {products.map((p) => (
                <div key={p.id} className="bg-white rounded-2xl p-5 shadow-md">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-gray-800">
                        {PRODUCT_ICON[p.activitySlug]} {p.name}
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {p.activitySlug === 'meetup' ? '飛行会' : '貸切業務'}の予約に使える
                        {p.uses > 1
                          ? `1回券コードを${p.uses}枚発行します（1枚ずつ譲渡可能）`
                          : '1回券コードを発行します'}
                      </p>
                      <p className="text-sky-700 font-bold mt-1">
                        {p.priceJpy.toLocaleString()}円
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openPayment({ kind: 'product', product: p })}
                      disabled={buyingId !== null}
                      className="shrink-0 bg-sky-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-sky-700 disabled:opacity-50"
                    >
                      {buyingId === p.id ? '処理中...' : '購入する'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <h2 className="font-bold text-gray-700 mb-2">国家資格講座チケット</h2>
          </>
        )}

        {/* 基本講習 + オプション */}
        <div className="space-y-4">
          {basics.map((b) => {
            const options = optionsFor(b)
            const selected = selectedOptions[b.id] ?? []
            return (
              <div key={b.id} className="bg-white rounded-2xl p-5 shadow-md">
                <h2 className="font-semibold text-gray-800">
                  【{MACHINE_LABEL[b.machine]}】{LICENSE_LABEL[b.license]}無人航空機操縦士コース
                  <span className="text-sm font-normal text-gray-500 ml-1">
                    （{EXPERIENCE_LABEL[b.experience]}）
                  </span>
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  基本講習
                  {b.days != null && (
                    <span className="text-xs text-gray-400 ml-1">（受講{b.days}日）</span>
                  )}
                  <span className="text-sky-700 font-bold ml-2">
                    {b.priceJpy.toLocaleString()}円
                  </span>
                </p>

                {/* 限定解除オプション */}
                {options.length > 0 && (
                  <div className="mt-3 border-t border-gray-100 pt-3 space-y-2">
                    <p className="text-xs font-semibold text-gray-500">
                      限定解除オプション（追加できます）
                    </p>
                    {options.map((o) => (
                      <label
                        key={o.id}
                        className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selected.includes(o.id)}
                          onChange={() => toggleOption(b.id, o.id)}
                          className="w-4 h-4 accent-sky-600"
                        />
                        <span>
                          {OPTION_LABEL[o.itemType as keyof typeof OPTION_LABEL]}
                          <span className="text-gray-500 ml-1">
                            +{o.priceJpy.toLocaleString()}円
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => openPayment({ kind: 'course', basic: b })}
                  disabled={buyingId !== null}
                  className="w-full mt-4 bg-sky-600 text-white font-semibold py-3 rounded-lg hover:bg-sky-700 disabled:opacity-50"
                >
                  {buyingId === b.id
                    ? '処理中...'
                    : `購入する（合計 ${totalFor(b).toLocaleString()}円）`}
                </button>
              </div>
            )
          })}
          {basics.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-8 bg-white rounded-2xl border border-dashed border-gray-300">
              該当するコースがありません
            </p>
          )}
        </div>
      </div>

      {/* 支払い方法選択モーダル */}
      {pending && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50"
          onClick={() => setPending(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-bold text-gray-800 mb-1">お支払い方法を選択</h2>
            <p className="text-sm text-gray-500 mb-1">
              {pending.kind === 'product'
                ? pending.product.name
                : `【${MACHINE_LABEL[pending.basic.machine]}】${LICENSE_LABEL[pending.basic.license]}無人航空機操縦士コース（${EXPERIENCE_LABEL[pending.basic.experience]}）`}
            </p>
            <p className="text-sky-700 font-bold mb-4">
              合計{' '}
              {(pending.kind === 'product'
                ? pending.product.priceJpy
                : totalFor(pending.basic)
              ).toLocaleString()}
              円
            </p>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => startCheckout(pending, 'card')}
                className="w-full bg-sky-600 text-white font-semibold py-3 rounded-lg hover:bg-sky-700 flex items-center justify-center gap-2"
              >
                💳 クレジットカードで支払う
              </button>
              <button
                type="button"
                onClick={() => startCheckout(pending, 'bank_transfer')}
                className="w-full bg-white text-sky-700 border-2 border-sky-600 font-semibold py-3 rounded-lg hover:bg-sky-50 flex items-center justify-center gap-2"
              >
                🏦 銀行振込で支払う
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              銀行振込の場合、専用の振込先口座をご案内します。
              ご入金の確認後（通常1〜3営業日）にチケットコードを発行します。
            </p>
            <button
              type="button"
              onClick={() => setPending(null)}
              className="w-full text-sm text-gray-500 hover:text-gray-700 mt-3 py-1"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
