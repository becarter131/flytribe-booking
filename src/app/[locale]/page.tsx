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
        <h1 className="text-4xl font-bold text-sky-800 mb-2">フライトライブ予約システム</h1>
        <p className="font-mono text-sm text-sky-600 mb-4">FlyTribe Booking</p>
        <p className="text-lg text-gray-600 mb-12">
          ドローン飛行場のご利用予約はこちらから
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

        <p className="text-xs text-gray-500">
          ※ いずれかの利用区分で確定した日は、他の区分ではご予約いただけません
        </p>
      </div>
    </main>
  )
}
