import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'

// 公式ウェブサイトのトップページ（プレースホルダー）
// flytribe.co.jp のルートに公式サイトを、/booking 配下に予約システムを配置する構成。
// 本格的なコンテンツ（会社概要・事業紹介・アクセス等）は今後ここに構築していく。
export const dynamic = 'force-dynamic'

interface PostRow {
  id: string
  category: string
  title: string
  published_at: string
}

export default async function HomePage() {
  const { data: posts } = await supabaseAdmin
    .from('ft_posts')
    .select('id, category, title, published_at')
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(3)

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

        {/* 最新のお知らせ */}
        {(posts ?? []).length > 0 && (
          <section className="mt-12 text-left">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-sky-900">お知らせ</h2>
              <Link href="/news" className="text-sm text-sky-600 hover:underline">
                一覧を見る →
              </Link>
            </div>
            <div className="space-y-2">
              {((posts ?? []) as PostRow[]).map((p) => (
                <Link
                  key={p.id}
                  href={`/news/${p.id}`}
                  className="block bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow px-4 py-3"
                >
                  <span className="text-xs text-gray-400 mr-3">
                    {new Date(p.published_at).toLocaleDateString('ja-JP')}
                  </span>
                  <span className="text-sm font-semibold text-gray-800">{p.title}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <p className="text-xs text-gray-400 mt-12">公式サイトは現在準備中です。</p>
      </div>
    </main>
  )
}
