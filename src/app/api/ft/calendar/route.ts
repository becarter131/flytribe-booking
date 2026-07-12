import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { applyCrossBlock, computeOwnState, type FtDateState } from '@/lib/ft'

// 指定月について、全利用区分の日付状態をまとめて返す。
// どれかの区分で「確定」した日は、他の区分では occupied（埋まり）になる
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const year = Number(sp.get('year'))
  const month = Number(sp.get('month')) // 1-12
  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    return NextResponse.json({ error: 'year/month is required' }, { status: 400 })
  }

  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = new Date(year, month, 1)
  const end = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-01`

  const [{ data: activities }, { data: requests }, { data: dates }] = await Promise.all([
    supabaseAdmin.from('ft_activities').select('*').eq('is_active', true).order('sort'),
    supabaseAdmin
      .from('ft_requests')
      .select('activity_id, date, party_size, status')
      .gte('date', start)
      .lt('date', end),
    supabaseAdmin
      .from('ft_dates')
      .select('activity_id, date, operator_status')
      .gte('date', start)
      .lt('date', end),
  ])

  const counts = new Map<string, number>() // `${activityId}|${date}` -> 人数
  for (const r of requests ?? []) {
    if (r.status !== 'active') continue
    const key = `${r.activity_id}|${r.date}`
    counts.set(key, (counts.get(key) ?? 0) + r.party_size)
  }
  const operator = new Map<string, 'none' | 'approved' | 'rejected'>()
  for (const d of dates ?? []) operator.set(`${d.activity_id}|${d.date}`, d.operator_status)

  // 情報のある日付の集合
  const allDates = new Set<string>()
  for (const key of [...counts.keys(), ...operator.keys()]) {
    allDates.add(key.split('|')[1])
  }

  // 日付ごとに: 各区分の単体状態 → 相互ブロックを適用
  const days: Record<string, Record<string, { count: number; state: FtDateState }>> = {}
  for (const date of allDates) {
    const own = new Map<string, ReturnType<typeof computeOwnState>>()
    for (const a of activities ?? []) {
      const key = `${a.id}|${date}`
      own.set(
        a.slug,
        computeOwnState(counts.get(key) ?? 0, a.min_participants, operator.get(key) ?? 'none')
      )
    }
    days[date] = {}
    for (const a of activities ?? []) {
      const anyOtherConfirmed = (activities ?? []).some(
        (b) => b.slug !== a.slug && own.get(b.slug) === 'confirmed'
      )
      days[date][a.slug] = {
        count: counts.get(`${a.id}|${date}`) ?? 0,
        state: applyCrossBlock(own.get(a.slug)!, anyOtherConfirmed),
      }
    }
  }

  return NextResponse.json({
    activities: (activities ?? []).map((a) => ({
      id: a.id,
      slug: a.slug,
      name: a.name,
      description: a.description,
      minParticipants: a.min_participants,
      maxParticipants: a.max_participants,
    })),
    days,
  })
}
