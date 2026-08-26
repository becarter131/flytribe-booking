// プライバシーポリシー

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: '1. 取得する情報',
    body: [
      '当社は、本サービスの提供にあたり、氏名、法人名（任意）、メールアドレス、電話番号、生年月日、予約・購入の履歴、お問い合わせの内容を取得します。',
      'クレジットカード情報は決済代行会社（Stripe, Inc.）が直接取り扱い、当社のサーバーには保存されません。',
    ],
  },
  {
    title: '2. 利用目的',
    body: [
      '取得した情報は、予約・購入の受付と管理、本人確認、チケットの発行、予約に関するご連絡（確定・中止・前日のご案内等）、お問い合わせへの対応、および本サービスの改善のために利用します。',
    ],
  },
  {
    title: '3. 第三者提供・委託',
    body: [
      '当社は、法令に基づく場合を除き、ご本人の同意なく個人情報を第三者に提供しません。',
      '本サービスの運営にあたり、次の事業者に取り扱いを委託しています: Stripe（決済）、Supabase（データ保管）、Vercel（アプリケーション運用）、Resend（メール送信）。',
    ],
  },
  {
    title: '4. 保存期間',
    body: [
      '予約・取引の記録は、法令上の保存義務および会計処理のために必要な期間保存します。アカウントおよび個人情報の削除をご希望の場合は、下記窓口までご連絡ください。',
    ],
  },
  {
    title: '5. Cookie 等について',
    body: [
      '本サービスは、ログイン状態の維持のためにブラウザの保存領域（localStorage 等）を使用します。第三者による広告目的のトラッキングは行っていません。',
    ],
  },
  {
    title: '6. お問い合わせ窓口',
    body: [
      '個人情報の開示・訂正・削除等のご請求は、以下までご連絡ください。',
      '株式会社フライトライブ（愛知県瀬戸市余床町820番地）／メール: info@flytribe.co.jp ／サイト内のお問い合わせフォームもご利用いただけます。',
    ],
  },
]

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100 px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">プライバシーポリシー</h1>
        <div className="bg-white rounded-2xl shadow-md p-6 space-y-5">
          {SECTIONS.map((s) => (
            <section key={s.title}>
              <h2 className="font-semibold text-gray-800 mb-1">{s.title}</h2>
              {s.body.map((p, i) => (
                <p key={i} className="text-sm text-gray-600 leading-relaxed mb-1">
                  {p}
                </p>
              ))}
            </section>
          ))}
          <p className="text-xs text-gray-400 pt-2">制定日: 2026年7月19日　株式会社フライトライブ</p>
        </div>
      </div>
    </main>
  )
}
