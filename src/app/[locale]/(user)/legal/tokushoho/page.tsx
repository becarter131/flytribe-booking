// 特定商取引法に基づく表記

const ROWS: [string, string][] = [
  ['販売事業者', '株式会社フライトライブ'],
  ['運営責任者', '代表取締役社長　諸橋 拓也'],
  ['所在地', '〒489-0002　愛知県瀬戸市余床町820番地'],
  ['電話番号', '080-8109-1854（受付時間外はお問い合わせフォームをご利用ください）'],
  ['メールアドレス', 'info@flytribe.co.jp'],
  ['販売URL', 'https://flytribe-booking.vercel.app'],
  ['販売価格', '各商品・講座のページに表示する金額（消費税込み）'],
  ['販売価格以外の必要料金', 'インターネット接続に係る通信料金（お客様のご負担となります）'],
  ['支払方法', 'クレジットカード決済（Stripe）／銀行振込'],
  [
    '支払時期',
    'クレジットカード: ご注文時に決済されます。銀行振込: ご注文後にご案内する口座へお振込みください（入金確認後にチケットを発行します）',
  ],
  [
    '商品（チケット）の引き渡し時期',
    'クレジットカード決済完了後、即時にチケットコードを発行します。銀行振込の場合は入金確認後に発行します。チケットの有効期限は発行から6ヶ月です',
  ],
  [
    'キャンセル・返金',
    'チケット購入後の返金・払い戻しはお受けしておりません。予約確定後の利用者都合によるキャンセルの場合、使用されたチケットは返還されません。天候不良または事業者都合により施設をご利用いただけない場合は、使用予定のチケットを返還します（有効期限内で再利用いただけます）。最低催行人数に達せず予約が成立しなかった場合も、チケットは自動的に返還されます',
  ],
  [
    'サービスの提供時期',
    '予約確定後、予約日に施設をご利用いただけます（予約は管理者の承認をもって確定します）',
  ],
]

export default function TokushohoPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100 px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">特定商取引法に基づく表記</h1>
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              {ROWS.map(([k, v]) => (
                <tr key={k} className="border-b border-gray-100 last:border-b-0">
                  <th className="text-left align-top bg-gray-50 px-4 py-3 w-44 font-medium text-gray-600">
                    {k}
                  </th>
                  <td className="px-4 py-3 text-gray-700 leading-relaxed">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}
