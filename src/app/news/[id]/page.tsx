import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'

// 公式サイト: お知らせ/ブログ記事詳細
export const dynamic = 'force-dynamic'

const CATEGORY_LABEL: Record<string, string> = { news: 'お知らせ', blog: 'ブログ' }

interface PostRow {
  id: string
  category: string
  title: string
  body: string
  published_at: string
}

async function getPost(id: string): Promise<PostRow | null> {
  // UUID以外が渡ると Supabase がエラーを返すため事前に弾く
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null
  const { data } = await supabaseAdmin
    .from('ft_posts')
    .select('id, category, title, body, published_at')
    .eq('id', id)
    .eq('is_published', true)
    .maybeSingle()
  return data as PostRow | null
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const post = await getPost(id)
  return {
    title: post ? `${post.title} | 株式会社フライトライブ` : 'お知らせ | 株式会社フライトライブ',
  }
}

export default async function NewsDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const post = await getPost(id)
  if (!post) notFound()

  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <Link href="/news" className="text-sm text-sky-600 hover:underline">
          ← お知らせ・ブログ一覧へ
        </Link>

        <article className="bg-white rounded-2xl shadow-md p-6 sm:p-8 mt-4">
          <div className="flex items-center gap-2 text-xs mb-3">
            <span
              className={`px-2 py-0.5 rounded-full font-semibold ${
                post.category === 'news'
                  ? 'bg-sky-100 text-sky-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              {CATEGORY_LABEL[post.category] ?? post.category}
            </span>
            <span className="text-gray-400">
              {new Date(post.published_at).toLocaleDateString('ja-JP')}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-6">{post.title}</h1>
          <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">{post.body}</div>
        </article>
      </div>
    </main>
  )
}
