import Link from 'next/link'

// 公式ウェブサイトのトップページ（プレースホルダー）
// flytribe.co.jp のルートに公式サイトを、/booking 配下に予約システムを配置する構成。
// 本格的なコンテンツ（会社概要・事業紹介・アクセス等）は今後ここに構築していく。
export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100 flex items-center justify-center px-4">
      <div className="max-w-xl w-full text-center py-16">
        <p className="text-sm tracking-widest text-sky-600 font-semibold mb-2">FLYTRIBE Inc.</p>
        <h1 className="text-4xl font-bold text-sky-900 mb-4">株式会社フライトライブ</h1>
        <p className="text-gray-600 mb-10 leading-relaxed">
          ドローン飛行場「AICHI AIR BASE」の運営を通じて、
          <br className="hidden sm:block" />
          ドローンの安全な利活用と人材育成を支えています。
        </p>

        <Link
          href="/booking"
          className="inline-block bg-sky-700 text-white font-bold rounded-2xl px-8 py-4 shadow-md hover:bg-sky-800 transition-colors"
        >
          飛行場のご予約はこちら →
        </Link>

        <p className="text-xs text-gray-400 mt-12">公式サイトは現在準備中です。</p>
      </div>
    </main>
  )
}
