import Link from 'next/link'
import { notFound } from 'next/navigation'

// 各利用区分のサービス詳細ページ。
// 【仮】の項目は事業者の正式な情報に差し替えること

interface Section {
  title: string
  items: string[]
}

interface ServiceDetail {
  icon: string
  name: string
  tagline: string
  price: string[]
  flow: string[]
  sections: Section[]
  notes: string[]
}

const DETAILS: Record<string, ServiceDetail> = {
  charter: {
    icon: '🏢',
    name: '貸切業務利用',
    tagline: '飛行場全体を1社で貸し切り、業務でご利用いただけます（機体テスト・操縦訓練・撮影など）。',
    price: [
      '貸切利用券: ¥54,000／1日1枚',
      'お得なセット券: 5枚 ¥180,000 ／ 10枚 ¥300,000（1回券コードを枚数分発行）',
      '※ セット券のご購入には自主管理規則への同意が必要です',
    ],
    flow: [
      'ショップで貸切利用券を購入（カード決済 または 銀行振込）',
      '予約カレンダーからご希望日を選び、チケットコードを入力して申込',
      '管理者の承認をもって予約確定（確定メールをお送りします）',
      '当日、施設をご利用ください',
    ],
    sections: [
      {
        title: '敷地の利用範囲',
        items: [
          '【仮】飛行エリア・駐機スペース・観覧エリアを含む場内全域をご利用いただけます',
          '【仮】立入禁止区域（設備機器周辺など）は当日スタッフの案内に従ってください',
        ],
      },
      {
        title: '入場方法',
        items: [
          '【仮】ご利用当日は正面ゲートからご入場ください',
          '【仮】ゲートの開錠方法・当日の連絡先は、確定メールにてご案内します',
          '【仮】車両の乗り入れ・駐車可能台数はお問い合わせください',
        ],
      },
      {
        title: '電気・建物の利用',
        items: [
          '【仮】場内の電源設備（コンセント）をご利用いただけます（充電・機材電源など）',
          '【仮】管理棟（休憩スペース・トイレ）をご利用いただけます',
          '【仮】大型電源が必要な場合は事前にご相談ください',
        ],
      },
    ],
    notes: [
      '貸切で確定した日は、他の区分（講座・飛行会）の予約は入りません',
      '天候不良などで利用できない場合はチケットを返還します（予約確定後の利用者都合キャンセルは返還されません）',
      '場内でのドローン飛行は関係法令および場内ルールを遵守してください',
    ],
  },
  course: {
    icon: '🎓',
    name: '国家資格講座利用',
    tagline: 'ドローンの国家資格（無人航空機操縦者技能証明）取得講座の実技会場としてご利用いただけます。',
    price: [
      '講座料金に飛行場利用料が含まれます（別途チケット購入は不要）',
      '講座のお申し込みはショップから（機体・資格区分・経験の有無により料金が異なります）',
      '講座のお申し込み時に、実技日程用のチケットコードが発行されます',
    ],
    flow: [
      'ショップで受講したい講座を選択して申込・決済',
      '発行されたチケットコードで、予約カレンダーから実技日を申込（最低催行3名）',
      '管理者の承認をもって日程確定（確定メールをお送りします）',
      '当日、講師の指導のもと実技講習を受講',
    ],
    sections: [
      {
        title: '当日の持ち物・服装',
        items: [
          '【仮】筆記用具・本人確認書類をお持ちください',
          '【仮】屋外での実技のため、動きやすい服装・靴でお越しください',
          '【仮】機体は会場で用意します（お持ち込みの可否は講座により異なります）',
        ],
      },
      {
        title: '入場方法・施設利用',
        items: [
          '【仮】開始時刻の15分前までに正面ゲートよりお越しください',
          '【仮】管理棟（休憩スペース・トイレ）をご利用いただけます',
          '【仮】駐車場をご利用いただけます',
        ],
      },
    ],
    notes: [
      '最低催行人数（3名）に達しない場合、講習は実施されません（チケットは自動返却されます）',
      '天候により実技を実施できない場合は日程を再調整します',
    ],
  },
  meetup: {
    icon: '🚁',
    name: '飛行会利用',
    tagline: 'ドローン愛好家が集まる共同飛行会です。10名以上で催行し、最大30名までご参加いただけます。',
    price: ['飛行会利用券: ¥3,000／1名1枚', 'ショップで事前購入のうえ、予約時にコードを入力してください'],
    flow: [
      'ショップで飛行会利用券を購入（参加人数分）',
      '予約カレンダーから参加したい日を選び、人数分のチケットコードを入力して申込',
      '10名以上集まり管理者が承認すると催行決定（確定メールをお送りします）',
      '当日、受付にてお名前を確認のうえご参加ください',
    ],
    sections: [
      {
        title: '飛行エリア・運営',
        items: [
          '【仮】飛行エリアは運営スタッフの管制のもち、順番にご利用いただきます',
          '【仮】持込機体の重量・種類に制限があります（詳細はお問い合わせください）',
          '【仮】初心者の方向けのサポートもあります',
        ],
      },
      {
        title: '入場方法・施設利用',
        items: [
          '【仮】開始時刻までに正面ゲートよりご入場ください',
          '【仮】管理棟（休憩スペース・トイレ）・電源設備をご利用いただけます',
          '【仮】駐車場をご利用いただけます（台数に限りがあります）',
        ],
      },
    ],
    notes: [
      '最低催行人数（10名）に達しない場合、飛行会は実施されません（チケットは自動返却されます）',
      '天候不良の場合は中止となり、チケットを返還します',
      '機体の保険加入状況を当日確認させていただく場合があります',
    ],
  },
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const d = DETAILS[slug]
  if (!d) notFound()

  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Link href="/ja" className="text-sm text-gray-500 hover:text-sky-700">
          ← トップに戻る
        </Link>

        <div className="bg-white rounded-2xl shadow-md p-6 mt-4 mb-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">{d.icon}</span>
            <h1 className="text-2xl font-bold text-gray-800">{d.name}</h1>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">{d.tagline}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6 mb-4">
          <h2 className="font-bold text-gray-800 mb-2">💴 料金・チケット</h2>
          <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
            {d.price.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6 mb-4">
          <h2 className="font-bold text-gray-800 mb-2">📋 ご利用の流れ</h2>
          <ol className="list-decimal pl-5 text-sm text-gray-700 space-y-1">
            {d.flow.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ol>
        </div>

        {d.sections.map((s) => (
          <div key={s.title} className="bg-white rounded-2xl shadow-md p-6 mb-4">
            <h2 className="font-bold text-gray-800 mb-2">🏟️ {s.title}</h2>
            <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
              {s.items.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </div>
        ))}

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-6">
          <h2 className="font-bold text-amber-800 mb-2">⚠️ 注意事項</h2>
          <ul className="list-disc pl-5 text-sm text-amber-800 space-y-1">
            {d.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <Link
            href={`/ja/reserve/${slug}`}
            className="bg-sky-600 text-white rounded-xl py-3 text-center font-semibold hover:bg-sky-700"
          >
            予約カレンダーへ
          </Link>
          <Link
            href="/ja/shop"
            className="bg-white text-sky-700 border border-sky-300 rounded-xl py-3 text-center font-semibold hover:bg-sky-50"
          >
            チケットを購入
          </Link>
        </div>

        <p className="text-xs text-gray-400 text-center">
          ※【仮】の項目は正式なご案内に順次差し替えます。ご不明点は
          <Link href="/ja/contact" className="text-sky-600 hover:underline">
            お問い合わせフォーム
          </Link>
          からご連絡ください。
        </p>
      </div>
    </main>
  )
}
