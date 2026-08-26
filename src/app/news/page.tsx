import type { Metadata } from 'next'
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'

// 公式サイト: お知らせ/ブログ一覧
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'お知らせ・ブログ | 株式会社フライトライブ',
  description: '株式会社フライトライブからのお知らせとブログ記事の一覧',
}

const CATEGORY_LABEL: Record<string, string> = { news: 'お知らせ', blog: 'ブログ' }

interface PostRow {
  id: string
  category: string
  title: string
  published_at: string
}

export default async function NewsListPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const { category } = await searchParams
  const filter = category === 'news' || category === 'blog' ? category : null

  let query = supabaseAdmin
    .from('ft_posts')
    .select('id, category, title, published_at')
    .eq('is_published', true)
    .order('published_at', { ascending: false })
  if (filter) query = query.eq('category', filter)
  const { data: posts } = await query

  const tabs = [
    { key: null, label: 'すべて', href: '/news' },
    { key: 'news', label: 'お知らせ', href: '/news?category=news' },
    { key: 'blog', label: 'ブログ', href: '/news?category=blog' },
  ]

  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <Link href="/" className="text-sm text-sky-600 hover:underline">
          ← トップへ戻る
        </Link>
        <h1 className="text-3xl font-bold text-sky-900 mt-4 mb-6">お知らせ・ブログ</h1>

        <div className="flex gap-2 mb-6">
          {tabs.map((t) => (
            <Link
              key={t.label}
              href={t.href}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                filter === t.key
                  ? 'bg-sky-700 text-white border-sky-700'
                  : 'bg-white text-sky-700 border-sky-300 hover:bg-sky-50'
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>

        <div className="space-y-3">
          {(posts ?? []).length === 0 && (
            <p className="text-sm text-gray-500 text-center py-10">記事はまだありません。</p>
          )}
          {((posts ?? []) as PostRow[]).map((p) => (
            <Link
              key={p.id}
              href={`/news/${p.id}`}
              className="block bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-4"
            >
              <div className="flex items-center gap-2 text-xs mb-1">
                <span
                  className={`px-2 py-0.5 rounded-full font-semibold ${
                    p.category === 'news'
                      ? 'bg-sky-100 text-sky-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {CATEGORY_LABEL[p.category] ?? p.category}
                </span>
                <span className="text-gray-400">
                  {new Date(p.published_at).toLocaleDateString('ja-JP')}
                </span>
              </div>
              <p className="font-semibold text-gray-800">{p.title}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
