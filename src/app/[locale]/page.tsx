import Link from 'next/link'
import { getSupabaseServer } from '@/lib/supabase-server'
import type { FtActivity } from '@/types'

const ICONS: Record<string, string> = {
  charter: '🏢',
  course: '🎓',
  meetup: '🚁',
}

export default async function HomePage() {
  const supabase = getSupabaseServer()
  const { data: activities } = await supabase
    .from('ft_activities')
    .select('*')
    .eq('is_active', true)
    .order('sort')

  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100">
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl font-bold text-sky-800 mb-4">フライトライブ予約システム</h1>
        <p className="text-lg text-gray-600 mb-12">
          AICHI AIR BASEのご利用予約はこちらから。利用にはチケットが必要です。
        </p>

        <div className="space-y-4 mb-12">
          {((activities ?? []) as FtActivity[]).map((a) => (
            <Link
              key={a.slug}
              href={`/ja/reserve/${a.slug}`}
              className="block bg-white rounded-2xl p-6 shadow-md hover:shadow-lg transition-shadow text-left"
            >
              <div className="flex items-center gap-4">
                <div className="text-4xl">{ICONS[a.slug] ?? '📅'}</div>
                <div>
                  <h2 className="font-bold text-lg text-gray-800">{a.name}</h2>
                  {a.description && (
                    <p className="text-sm text-gray-500 mt-1">{a.description}</p>
                  )}
                </div>
                <span className="ml-auto text-gray-400 shrink-0">→</span>
              </div>
            </Link>
          ))}
        </div>

        {/* チケット購入ショップへの入口 */}
        <Link
          href="/ja/shop"
          className="block bg-sky-700 text-white rounded-2xl p-5 shadow-md hover:bg-sky-800 transition-colors mb-4"
        >
          <div className="flex items-center justify-center gap-3">
            <span className="text-2xl">🎫</span>
            <span className="font-bold text-lg">チケット購入ショップ</span>
            <span>→</span>
          </div>
          <p className="text-xs text-sky-100 mt-1">
            各種チケットを事前購入できます
          </p>
        </Link>

        {/* 購入済みチケットの確認 */}
        <Link
          href="/ja/tickets"
          className="block bg-white text-sky-700 border border-sky-300 rounded-2xl p-4 shadow-sm hover:bg-sky-50 transition-colors mb-8"
        >
          <div className="flex items-center justify-center gap-2">
            <span className="font-semibold">マイチケット（購入済みコードの確認）</span>
            <span>→</span>
          </div>
        </Link>

        <p className="text-xs text-gray-500">
          ※ いずれかの利用区分で確定した日は、他の区分ではご予約いただけません
        </p>
      </div>
    </main>
  )
}
