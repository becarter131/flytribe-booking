'use client'

// フライトライブ予約システム 総合仕様書
// （システム仕様書・要件定義書・基本設計書・機能仕様書・運用マニュアル）
// 実装に変更を加えた際は、このページも合わせて更新すること

import { useEffect, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// 管理画面ログイン状態（sessionStorage）を購読する。SSR中は未ログイン扱い
function subscribeNoop() {
  return () => {}
}
function authedSnapshot(): boolean {
  return !!sessionStorage.getItem('adminPassword')
}
function ownerSnapshot(): boolean {
  return sessionStorage.getItem('ftIsOwner') === '1'
}

const UPDATED = '2026-07-19'

// ownerOnly: true の章はオーナーのみ表示（技術情報）。
// 管理者には業務に必要な章（要件定義・機能仕様・運用マニュアル）だけを表示する
const SECTIONS: { id: string; label: string; ownerOnly: boolean }[] = [
  { id: 'overview', label: '本書について', ownerOnly: false },
  { id: 'requirements', label: '要件定義（予約ルール）', ownerOnly: false },
  { id: 'architecture', label: 'システム構成', ownerOnly: true },
  { id: 'features', label: '機能仕様', ownerOnly: false },
  { id: 'database', label: 'データベース設計', ownerOnly: true },
  { id: 'api', label: 'API一覧', ownerOnly: true },
  { id: 'operations', label: '運用マニュアル', ownerOnly: false },
  { id: 'history', label: '主要な変更履歴', ownerOnly: true },
]

const ACTIVITIES = [
  ['貸切業務利用（charter）', '1社', '1社', '¥54,000/枚（5枚¥180,000・10枚¥300,000）', '会社単位の貸切。確定日は他区分の予約不可（埋まり表示）'],
  ['国家資格講座利用（course）', '3名', '10名', '講座料金に含む（講座申込時にチケット発行）', '国家資格取得講座の実技利用'],
  ['飛行会利用（meetup）', '10名', '30名', '¥3,000/枚', '共同飛行会。相乗り可'],
]

const DB_TABLES: { name: string; desc: string; cols: [string, string][] }[] = [
  {
    name: 'ft_users',
    desc: '利用者アカウント',
    cols: [
      ['id', 'UUID / 主キー'],
      ['name', '氏名（必須）'],
      ['company_name', '法人名（任意）'],
      ['email', 'メールアドレス（一意・ログインID）'],
      ['phone / birthdate', '電話番号・生年月日'],
      ['password_hash', 'scrypt形式 "salt:hash"（null=旧アカウント未設定）'],
    ],
  },
  {
    name: 'ft_activities',
    desc: '利用区分マスタ（貸切・講座・飛行会）',
    cols: [
      ['slug', 'charter / course / meetup'],
      ['min_participants', '最低催行人数（確定の条件）'],
      ['max_participants', '定員'],
      ['sort / is_active', '表示順・有効フラグ'],
    ],
  },
  {
    name: 'ft_requests',
    desc: '予約申込',
    cols: [
      ['activity_id / date / user_id', '区分・日付・申込者'],
      ['party_size', '人数（貸切は社数）'],
      ['status', 'active（有効）/ cancelled（利用者キャンセル）/ rejected（受付停止・不成立）'],
    ],
  },
  {
    name: 'ft_dates',
    desc: '日付×区分ごとの管理者判断',
    cols: [
      ['activity_id / date', '区分・日付（複合一意）'],
      ['operator_status', 'none（未判断）/ approved（確定）/ rejected（受付停止）'],
    ],
  },
  {
    name: 'ft_coupons',
    desc: 'チケット（利用券）',
    cols: [
      ['code', 'チケットコード（8桁小文字英数字・i/l/o/0/1除外・大小文字区別なし照合）'],
      ['activity_id', '使用可能区分（null=全区分）'],
      ['remaining_uses', '残回数（予約で消費・返却で復元）'],
      ['ticket_order_id', '発行元の注文'],
      ['expires_at', '有効期限（発行から6ヶ月）'],
    ],
  },
  {
    name: 'ft_request_coupons',
    desc: '予約×チケットの紐付け（1予約=複数チケット可）',
    cols: [['request_id / coupon_id / uses', '予約・チケット・消費回数']],
  },
  {
    name: 'ft_ticket_orders / ft_ticket_order_items',
    desc: 'ショップ注文（チケット・講座）',
    cols: [
      ['price_jpy / status', '金額・pending（振込待ち等）/ paid'],
      ['payment_method', 'card（Stripe）/ bank_transfer（銀行振込）'],
      ['shop_product_id / course_item_id', '購入対象（利用券 or 講座）'],
    ],
  },
  {
    name: 'ft_course_items',
    desc: '国家資格講座の料金マスタ（機体×資格×経験の組み合わせ約20項目+限定解除）',
    cols: [['machine / license / experience / days / price_jpy', '機体・資格・経験・日数・料金']],
  },
  {
    name: 'ft_shop_products',
    desc: '利用券マスタ（4種）',
    cols: [['name / activity_slug / uses / price_jpy', '商品名・対象区分・発行枚数・価格']],
  },
  {
    name: 'ft_admins',
    desc: '管理者アカウント',
    cols: [
      ['name / birthdate / phone / email', '登録情報（メールはログインID・一意）'],
      ['password_hash', 'scrypt（null=旧方式・要招待コード再登録）'],
      ['is_active', '無効化フラグ（無効=ログイン不可・通知対象外）'],
      ['is_owner', 'オーナー権限フラグ'],
    ],
  },
  {
    name: 'ft_admin_invites',
    desc: '管理者招待コード（使い捨て・7日有効）',
    cols: [['code / expires_at / used_by_admin_id / used_at', 'コード・期限・使用者・使用日時']],
  },
  {
    name: 'ft_admin_sessions',
    desc: '管理者ログインセッション（30日有効）',
    cols: [['token / admin_id / expires_at', 'Bearerトークン・管理者・期限']],
  },
  {
    name: 'ft_password_resets',
    desc: 'パスワード再設定トークン（利用者・管理者共用、1時間有効・使い捨て）',
    cols: [['token / kind / target_id / expires_at / used_at', 'トークン・user|admin・対象・期限・使用済']],
  },
  {
    name: 'ft_code_failures',
    desc: 'チケットコード誤入力の記録（10分間に10回で一時ブロック）',
    cols: [['user_id / ip / created_at', '試行者の記録']],
  },
]

const APIS: [string, string, string, string][] = [
  ['POST', '/api/ft/users', '不要', '利用者登録（旧アカウントは同メール再登録で引き継ぎ）'],
  ['POST', '/api/ft/login', '不要', '利用者ログイン'],
  ['POST', '/api/ft/password-reset/request', '不要', 'パスワード再設定リンクの申請（利用者・管理者共用）'],
  ['POST', '/api/ft/password-reset/confirm', '不要', '新パスワードの設定（管理者は全セッション失効）'],
  ['GET', '/api/ft/calendar', '不要', '月別カレンダー（区分ごとの申込数・状態）'],
  ['POST', '/api/ft/requests', '不要', '予約申込（人数分のチケットコード必須・過去日不可・当日可）'],
  ['POST', '/api/ft/requests/cancel', '不要', '申込キャンセル（確定後は不可・チケット自動返却・管理者へ通知）'],
  ['GET', '/api/ft/mine', '不要', '自分の申込一覧'],
  ['GET', '/api/ft/my-tickets', '不要', '自分のチケット一覧'],
  ['GET', '/api/ft/course-items', '不要', '講座料金マスタ'],
  ['GET', '/api/ft/shop/products', '不要', '利用券マスタ'],
  ['POST', '/api/ft/shop/checkout', '不要', 'ショップ購入（Stripe Checkout / 銀行振込）'],
  ['GET', '/api/ft/shop/orders/[id]', '不要', '注文状況（購入完了画面用）'],
  ['POST', '/api/webhooks/stripe', 'Stripe署名', '決済完了→チケット発行（銀行振込は async_payment_succeeded）'],
  ['GET', '/api/ft/cron/reminders', 'CRON_SECRET', '毎朝9時JST: 前日リマインダー+期限切れ仮予約の整理'],
  ['GET/PATCH', '/api/admin/ft', '管理者', '予約一覧の取得 / 承認・受付停止・取り消し（scope=activity|date）'],
  ['GET/POST/PATCH', '/api/admin/ft/coupons', '管理者', 'チケット一覧・発行・無効化'],
  ['POST', '/api/admin/ft/admins', '招待コード', '管理者登録（登録後そのままログイン状態）'],
  ['GET', '/api/admin/ft/admins', '管理者', '管理者一覧'],
  ['PATCH', '/api/admin/ft/admins', 'オーナー', '管理者の有効化/無効化・オーナー権限の付与/解除'],
  ['POST', '/api/admin/ft/login', '不要', '管理者ログイン（30日セッショントークン発行）'],
  ['GET/POST', '/api/admin/ft/invites', 'オーナー', '招待コードの一覧・発行'],
]

const MAILS: [string, string, string][] = [
  ['予約申込時', '申込者・管理者全員', '申込内容の受付確認 / 新規申込の通知（合計人数付き）'],
  ['予約確定時', '申込者全員・管理者全員', '確定のお知らせ / 確定サマリー+受付停止の注意'],
  ['受付停止時', '対象の申込者・管理者全員', '取り消しとチケット返却の案内 / 停止範囲と取消件数の共有'],
  ['利用者キャンセル時（確定前）', '管理者全員', '誰が・いつ・何人分をキャンセルしたか'],
  ['利用の前日 朝9時', '確定予約の申込者・管理者全員', '明日のご利用案内 / 確定予約サマリー'],
  ['予約不成立時（翌朝9時）', '対象の申込者', '催行人数未達で不成立・チケット返却の案内'],
  ['パスワード再設定申請時', '申請者', '再設定リンク（1時間有効・1回のみ）'],
]

const SECTION_CLS = 'bg-white rounded-2xl shadow p-6 mb-6 scroll-mt-20'
const H2_CLS = 'text-xl font-bold text-gray-800 mb-4 border-l-4 border-sky-500 pl-3'
const H3_CLS = 'font-bold text-gray-700 mt-5 mb-2'
const P_CLS = 'text-sm text-gray-700 leading-relaxed mb-2'
const TABLE_CLS = 'w-full text-sm border-collapse mb-3'
const TH_CLS = 'bg-sky-50 text-left text-gray-600 font-medium px-3 py-2 border border-gray-200'
const TD_CLS = 'px-3 py-2 border border-gray-200 text-gray-700 align-top'

export default function SpecPage() {
  const router = useRouter()
  // 管理画面にログイン済みの場合のみ表示する（未ログインはダッシュボードへ）
  const authed = useSyncExternalStore(subscribeNoop, authedSnapshot, () => false)
  const isOwner = useSyncExternalStore(subscribeNoop, ownerSnapshot, () => false)

  useEffect(() => {
    if (!authed) router.replace('/ja/dashboard')
  }, [authed, router])

  // 表示する章と番号（管理者はオーナー専用章を除いて連番になる）
  const visible = SECTIONS.filter((s) => isOwner || !s.ownerOnly)
  const numOf = (id: string) => visible.findIndex((s) => s.id === id) + 1
  const heading = (id: string) => {
    const s = SECTIONS.find((x) => x.id === id)
    return `${numOf(id)}. ${s?.label ?? ''}`
  }

  if (!authed) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">確認中...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/ja/dashboard" className="text-sm text-gray-500 hover:text-sky-700">
          ← 管理画面に戻る
        </Link>
        <h1 className="text-2xl font-bold text-gray-800 mt-3 mb-1">
          フライトライブ予約システム {isOwner ? '総合仕様書' : '運用マニュアル'}
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          最終更新: {UPDATED} ／ 対象: AICHI AIR BASE ドローン飛行場予約システム（flytribe-booking.vercel.app）
        </p>

        {/* 目次 */}
        <div className={SECTION_CLS}>
          <h2 className={H2_CLS}>目次</h2>
          <ul className="grid sm:grid-cols-2 gap-1 text-sm">
            {visible.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-sky-600 hover:underline">
                  {i + 1}. {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* 1. 本書について */}
        <section id="overview" className={SECTION_CLS}>
          <h2 className={H2_CLS}>{heading('overview')}</h2>
          <p className={P_CLS}>
            本書はフライトライブ予約システムの要件定義・システム仕様・基本設計・機能仕様・運用手順をまとめた総合仕様書です。
            対象読者は運営管理者（オーナー・管理者）および保守開発者です。
          </p>
          <p className={P_CLS}>
            本システムはドローン飛行場「AICHI AIR BASE」の予約受付・チケット販売・予約管理を行う Web アプリケーションです。
            利用者は日本語話者を想定し、UI・通知はすべて日本語です。
          </p>
        </section>

        {/* 2. 要件定義 */}
        <section id="requirements" className={SECTION_CLS}>
          <h2 className={H2_CLS}>{heading('requirements')}</h2>

          <h3 className={H3_CLS}>■ 業務要件</h3>
          <p className={P_CLS}>
            飛行場は1日1組（1区分）のみが利用できる単一資源である。利用形態は以下の3区分で、
            いずれも「事前にチケット（利用券）を購入 → カレンダーから日付を選んで申込 → 管理者の承認で確定」という流れをとる。
          </p>
          <table className={TABLE_CLS}>
            <thead>
              <tr>
                {['利用区分', '最低催行', '定員', 'チケット価格', '備考'].map((h) => (
                  <th key={h} className={TH_CLS}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ACTIVITIES.map((row) => (
                <tr key={row[0]}>
                  {row.map((c, i) => (
                    <td key={i} className={TD_CLS}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <h3 className={H3_CLS}>■ 予約確定の要件</h3>
          <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1 mb-2">
            <li>人数が最低催行人数に達しても<strong>自動確定はしない</strong>。管理者の承認操作によってのみ確定する</li>
            <li>承認は最低催行人数到達が条件。同日に他区分が確定済みの場合は承認できない（二重確定の防止）</li>
            <li>いずれかの区分で確定した日は、他の区分では「埋まり」として予約不可になる</li>
            <li>当日の申込・当日の承認は可能</li>
          </ul>

          <h3 className={H3_CLS}>■ キャンセルポリシー</h3>
          <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1 mb-2">
            <li>確定前: 利用者は申込をキャンセルできる（チケット自動返却）</li>
            <li>確定後: 利用者都合のキャンセルは不可（システム上も操作をブロック）。キャンセルされた場合チケットは返還されない</li>
            <li>天候不良・事業者都合で利用できない場合: 管理者が受付停止にすることでチケットを返還する</li>
            <li>申込時に上記ポリシーの同意ポップアップを表示し、同意した場合のみ申込できる</li>
          </ul>

          <h3 className={H3_CLS}>■ 非機能要件</h3>
          <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
            <li>日本語のみ対応（多言語不要）。スマートフォン・PC 両対応のレスポンシブUI</li>
            <li>個人情報（氏名・連絡先）は管理者のみ閲覧可。パスワードは scrypt でハッシュ化保存</li>
            <li>カード情報は Stripe が保持し、本システムでは保存しない</li>
          </ul>
        </section>

        {/* 3. システム構成 */}
        {isOwner && (
        <section id="architecture" className={SECTION_CLS}>
          <h2 className={H2_CLS}>{heading('architecture')}</h2>

          <h3 className={H3_CLS}>■ 技術スタック</h3>
          <table className={TABLE_CLS}>
            <tbody>
              {[
                ['フレームワーク', 'Next.js（App Router）+ React + TypeScript + Tailwind CSS'],
                ['ホスティング', 'Vercel（GitHub の main ブランチへの push で自動デプロイ）'],
                ['データベース', 'Supabase（PostgreSQL）。テーブルはすべて ft_ プレフィックス'],
                ['決済', 'Stripe（カード決済・銀行振込 jp_bank_transfer / Webhook でチケット発行）'],
                ['メール送信', 'Resend（送信元 noreply@flytribe.co.jp・DNS は GMO サーバー側で認証済み）'],
                ['定時処理', 'Vercel Cron（毎朝9時JST → /api/ft/cron/reminders）'],
                ['リポジトリ', 'github.com/becarter131/flytribe-booking'],
                ['本番URL', 'https://flytribe-booking.vercel.app'],
              ].map(([k, v]) => (
                <tr key={k}>
                  <th className={`${TH_CLS} w-36`}>{k}</th>
                  <td className={TD_CLS}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 className={H3_CLS}>■ 環境変数（Vercel に設定・値は本書に記載しない）</h3>
          <table className={TABLE_CLS}>
            <tbody>
              {[
                ['NEXT_PUBLIC_SUPABASE_URL / ANON_KEY', 'Supabase 接続情報（公開可）'],
                ['SUPABASE_SERVICE_ROLE_KEY', 'サーバー側DB操作用（秘匿）'],
                ['ADMIN_PASSWORD', 'オーナー用（非常用）ログインパスワード'],
                ['STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET', 'Stripe 決済・Webhook 署名検証'],
                ['RESEND_API_KEY / MAIL_FROM', 'メール送信'],
                ['CRON_SECRET', '定時処理エンドポイントの認証'],
              ].map(([k, v]) => (
                <tr key={k}>
                  <th className={`${TH_CLS} w-80 font-mono text-xs`}>{k}</th>
                  <td className={TD_CLS}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        )}

        {/* 4. 機能仕様 */}
        <section id="features" className={SECTION_CLS}>
          <h2 className={H2_CLS}>{heading('features')}</h2>

          <h3 className={H3_CLS}>■ 画面一覧</h3>
          <table className={TABLE_CLS}>
            <thead>
              <tr>
                {['URL', '画面', '主な機能'].map((h) => (
                  <th key={h} className={TH_CLS}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['/ja', 'トップ', '3区分の入口・ログイン状態表示'],
                ['/ja/register', '会員登録', '氏名・法人名(任意)・メール・電話・生年月日・パスワード(8+)'],
                ['/ja/login', 'ログイン', 'メール+パスワード。パスワード再設定への導線あり'],
                ['/ja/reset-password', 'パスワード再設定', '利用者・管理者共用（?kind=admin で管理者向け）'],
                ['/ja/reserve/[区分]', '予約カレンダー', '月間カレンダー・申込（人数分のチケットコード入力・同意ポップアップ）・自分の申込一覧・キャンセル'],
                ['/ja/shop', 'ショップ', '利用券4種・国家資格講座の購入（カード/銀行振込）。貸切セットは自主管理規則の同意モーダル必須'],
                ['/ja/tickets', 'マイチケット', '保有チケットの残回数・有効期限'],
                ['/ja/dashboard', '管理画面', '予約一覧・承認/受付停止・カレンダー管理・チケット管理・オーナー管理'],
                ['/ja/dashboard/spec', '総合仕様書', '本ページ'],
              ].map(([u, n, f]) => (
                <tr key={u}>
                  <td className={`${TD_CLS} font-mono text-xs whitespace-nowrap`}>{u}</td>
                  <td className={`${TD_CLS} whitespace-nowrap`}>{n}</td>
                  <td className={TD_CLS}>{f}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 className={H3_CLS}>■ 予約の状態遷移</h3>
          <p className={P_CLS}>日付×区分ごとの状態は以下の5種類。カレンダー・管理画面で色分け表示される。</p>
          <table className={TABLE_CLS}>
            <thead>
              <tr>
                {['状態', '色', '条件'].map((h) => (
                  <th key={h} className={TH_CLS}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['空き（blank）', '灰', '有効な申込がない'],
                ['仮予約（tentative）', '黄', '1名以上の申込があるが未確定'],
                ['確定（confirmed）', '緑', '管理者が承認した（人数だけでは確定しない）'],
                ['受付停止（rejected）', '赤', '管理者が停止した（申込は取り消し・チケット返却）'],
                ['埋まり（occupied）', '濃灰', '同日に他区分が確定している（予約不可）'],
              ].map(([s, c, cond]) => (
                <tr key={s}>
                  <td className={`${TD_CLS} whitespace-nowrap`}>{s}</td>
                  <td className={TD_CLS}>{c}</td>
                  <td className={TD_CLS}>{cond}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 className={H3_CLS}>■ 受付停止の2つの範囲</h3>
          <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1 mb-2">
            <li><strong>予約一覧から（区分単位）</strong>: その申し込み（区分×日付）だけを停止。承認済みの他区分には影響しない</li>
            <li><strong>カレンダー管理から（日付単位）</strong>: その日の全3区分を一括停止（悪天候などで丸1日止める場合）</li>
            <li>いずれも対象申込のチケットを自動返却し、申込者へメール通知する。停止した申込は一覧にグレーで残り「受付停止を取り消す」で解除できる（取り消された申込自体は復活しない）</li>
          </ul>

          <h3 className={H3_CLS}>■ チケット（利用券）仕様</h3>
          <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1 mb-2">
            <li>コードは8桁の小文字英数字（紛らわしい i/l/o/0/1 を除外）。照合は大小文字を区別しない</li>
            <li>有効期限は発行から6ヶ月。予約申込には人数分のコードが必要（同一コードの複数入力で残回数をまとめて消費可）</li>
            <li>セット券（5枚・10枚）は1回券コードを枚数分発行する</li>
            <li>誤入力対策: 10分間に10回失敗でそのユーザー/IPを一時ブロック</li>
            <li>返却条件: 確定前キャンセル・受付停止・予約不成立（催行人数未達で日付超過）で自動返却</li>
          </ul>

          <h3 className={H3_CLS}>■ 認証・権限</h3>
          <table className={TABLE_CLS}>
            <thead>
              <tr>
                {['役割', 'ログイン方法', 'できること'].map((h) => (
                  <th key={h} className={TH_CLS}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['利用者', 'メール+パスワード（scrypt）', '予約申込・キャンセル（確定前）・ショップ購入・マイチケット'],
                ['管理者', 'メール+パスワード（30日セッション）。登録にはオーナー発行の招待コードが必須', '予約の承認・受付停止・カレンダー管理・チケット発行/無効化・管理者一覧の閲覧'],
                ['オーナー', '管理者と同じ（is_owner フラグで自動判定）', '管理者の権限すべて+招待コード発行・管理者の無効化/有効化・オーナー権限の付与/解除'],
                ['非常用', 'ログイン画面「オーナー用」タブ+環境変数のパスワード', 'オーナーと同等（全オーナーがログイン不能時の復旧用）'],
              ].map(([r, l, c]) => (
                <tr key={r}>
                  <td className={`${TD_CLS} whitespace-nowrap`}>{r}</td>
                  <td className={TD_CLS}>{l}</td>
                  <td className={TD_CLS}>{c}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className={P_CLS}>
            補足: 最後の有効なオーナーの降格・無効化はシステムがブロックする。管理者を無効化すると既存セッションは即失効し、通知メールの対象からも外れる。
            パスワード再設定はメールで1時間有効の使い捨てリンクを送付（管理者の再設定時は全セッション失効）。
          </p>

          <h3 className={H3_CLS}>■ メール通知一覧</h3>
          <table className={TABLE_CLS}>
            <thead>
              <tr>
                {['タイミング', '宛先', '内容'].map((h) => (
                  <th key={h} className={TH_CLS}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MAILS.map(([t, to, body]) => (
                <tr key={t}>
                  <td className={`${TD_CLS} whitespace-nowrap`}>{t}</td>
                  <td className={TD_CLS}>{to}</td>
                  <td className={TD_CLS}>{body}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 className={H3_CLS}>■ 定時処理（毎朝9時 日本時間）</h3>
          <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
            <li><strong>前日リマインダー</strong>: 明日が確定済みの予約の申込者へ案内メール、管理者へ確定予約サマリー</li>
            <li><strong>期限切れ仮予約の整理</strong>: 確定しないまま日付が過ぎた申込を受付停止にし、チケットを自動返却して申込者へ不成立メールを送信（確定済みの過去予約は対象外）</li>
          </ul>
        </section>

        {/* 5. データベース設計 */}
        {isOwner && (
        <section id="database" className={SECTION_CLS}>
          <h2 className={H2_CLS}>{heading('database')}</h2>
          <p className={P_CLS}>
            Supabase（PostgreSQL）。全テーブルに ft_ プレフィックス。新テーブル作成時は
            service_role への権限付与（grant）を忘れないこと（自動付与が効かない環境のため）。
          </p>
          {DB_TABLES.map((t) => (
            <div key={t.name} className="mb-4">
              <p className="text-sm font-bold text-gray-800 font-mono">{t.name}</p>
              <p className="text-xs text-gray-500 mb-1">{t.desc}</p>
              <table className={TABLE_CLS}>
                <tbody>
                  {t.cols.map(([c, d]) => (
                    <tr key={c}>
                      <th className={`${TH_CLS} w-72 font-mono text-xs`}>{c}</th>
                      <td className={TD_CLS}>{d}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </section>
        )}

        {/* 6. API一覧 */}
        {isOwner && (
        <section id="api" className={SECTION_CLS}>
          <h2 className={H2_CLS}>{heading('api')}</h2>
          <div className="overflow-x-auto">
            <table className={TABLE_CLS}>
              <thead>
                <tr>
                  {['メソッド', 'パス', '認証', '概要'].map((h) => (
                    <th key={h} className={TH_CLS}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {APIS.map(([m, p, a, d]) => (
                  <tr key={`${m}${p}`}>
                    <td className={`${TD_CLS} font-mono text-xs whitespace-nowrap`}>{m}</td>
                    <td className={`${TD_CLS} font-mono text-xs whitespace-nowrap`}>{p}</td>
                    <td className={`${TD_CLS} whitespace-nowrap`}>{a}</td>
                    <td className={TD_CLS}>{d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={P_CLS}>
            管理者認証は Authorization: Bearer ヘッダー（セッショントークン or 非常用パスワード）。
            「オーナー」はオーナー権限のあるセッションのみ許可。
          </p>
        </section>
        )}

        {/* 7. 運用マニュアル */}
        <section id="operations" className={SECTION_CLS}>
          <h2 className={H2_CLS}>{heading('operations')}</h2>

          <h3 className={H3_CLS}>■ 日常の予約管理（最重要）</h3>
          <ol className="list-decimal pl-5 text-sm text-gray-700 space-y-1 mb-2">
            <li>新規申込のメール通知を受けたら管理画面の予約一覧を確認する</li>
            <li>最低催行人数に達した申込を「確定にする」で承認（申込者全員と管理者へ自動通知）</li>
            <li>
              <strong className="text-red-600">
                同じ日付に他の申し込みが残っている場合は、必ずそれぞれ「受付停止にする」を実行する
              </strong>
              （停止しないと承認されなかった利用者のチケットが返却されず、クレームの原因になる）
            </li>
            <li>悪天候などで丸1日止める場合はカレンダー管理から「この日を受付停止にする（全区分）」を使う</li>
          </ol>

          <h3 className={H3_CLS}>■ チケットの発行・管理</h3>
          <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1 mb-2">
            <li>通常はショップでの購入時に自動発行される（カード=即時、銀行振込=入金確認後）</li>
            <li>手動発行（特典・補償など）は管理画面のチケット管理から。用途をメモ欄に必ず記載する</li>
            <li>不要になったチケットは無効化できる。残回数0のチケットは表示切替で非表示にできる</li>
          </ul>

          <h3 className={H3_CLS}>■ 管理者アカウントの管理（オーナーのみ）</h3>
          <ol className="list-decimal pl-5 text-sm text-gray-700 space-y-1 mb-2">
            <li>オーナーパネルで「＋招待コードを発行」（7日有効・1回のみ使用可）</li>
            <li>コードを新しい管理者に渡し、ログイン画面の「新規登録」タブから登録してもらう</li>
            <li>退職などの際は管理者一覧から「無効化」（即座にログイン不可・通知対象外になる）</li>
            <li>オーナー権限の追加は「👑付与」から。最後のオーナーは降格・無効化できない</li>
          </ol>

          <h3 className={H3_CLS}>■ トラブル対応</h3>
          <table className={TABLE_CLS}>
            <thead>
              <tr>
                {['症状', '対応'].map((h) => (
                  <th key={h} className={TH_CLS}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['サイト全体が 500 エラー', 'Supabase の無料枠自動ポーズの可能性。Supabase ダッシュボードでプロジェクトを再開（Restore）する。復旧まで数分かかり、その間 521 エラーが出ることがある'],
                ['パスワードを忘れた（利用者・管理者）', 'ログイン画面の「パスワードをお忘れの方はこちら」から再設定メールを送信'],
                ['オーナー全員がログイン不能', 'ログイン画面「オーナー用」タブから非常用パスワードでログインし、招待コードで再登録する'],
                ['メールが届かない', 'Resend の送信ログを確認。迷惑メールフォルダの案内も行う。DNS は GMO サーバー側（お名前.com の画面ではない）で設定されている点に注意'],
                ['決済したのにチケットが発行されない', 'Stripe ダッシュボードで Webhook の配信状況を確認（失敗時は Stripe が自動リトライする）。銀行振込は入金確認後の発行'],
                ['誤って受付停止にした', '「受付停止を取り消す」で解除。ただし取り消された申込は復活しないため、利用者に再申込を依頼する（チケットは返却済み）'],
              ].map(([s, a]) => (
                <tr key={s}>
                  <td className={`${TD_CLS} w-52`}>{s}</td>
                  <td className={TD_CLS}>{a}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 className={H3_CLS}>■ 正式ローンチ前の残タスク</h3>
          <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
            <li>Vercel Pro プランへの切り替え（商用利用）</li>
            <li>特定商取引法表記・利用規約ページの整備</li>
            <li>貸切セット券の自主管理規則の正式文面への差し替え（現在は仮文面）</li>
            <li>銀行振込フローの実決済テスト（現在未テスト）</li>
            <li>テスト用チケット（01〜99）とテスト用アカウントの削除</li>
          </ul>
        </section>

        {/* 8. 変更履歴 */}
        {isOwner && (
        <section id="history" className={SECTION_CLS}>
          <h2 className={H2_CLS}>{heading('history')}</h2>
          <table className={TABLE_CLS}>
            <tbody>
              {[
                ['2026-07-12', '大幅拡張: ログイン認証・ショップ（利用券/講座・銀行振込）・チケット制予約・管理者承認確定・8桁コード・受付停止の一括化'],
                ['2026-07-13', 'メール通知の本稼働（Resend・noreply@flytribe.co.jp）'],
                ['2026-07-18', '管理者アカウントを招待コード制の個別ログインへ刷新'],
                ['2026-07-19', 'オーナーのフラグ制移行・パスワード再設定・受付停止の2スコープ化（区分単位/日付単位）・停止申込のグレーアウト表示・申込時の同意ポップアップ・カレンダーの申込数表示・通知拡充（確定時管理者通知・前日リマインダー・キャンセル/停止の管理者通知）・期限切れ仮予約の自動整理・本仕様書の作成'],
              ].map(([d, c]) => (
                <tr key={d}>
                  <th className={`${TH_CLS} w-28 whitespace-nowrap`}>{d}</th>
                  <td className={TD_CLS}>{c}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-gray-400 mt-4">
            本仕様書は実装と同じリポジトリで管理されています（src/app/[locale]/(admin)/dashboard/spec/page.tsx）。
            機能を変更した際は本書も更新してください。
          </p>
        </section>
        )}
      </div>
    </main>
  )
}
