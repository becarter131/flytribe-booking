import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'
import { computeOwnState } from '@/lib/ft'

// 予約リクエストのある日付の一覧（管理者用）
export async function GET(req: NextRequest) {
  const denied = requireAdmin(req)
  if (denied) return denied

  const today = new Date().toISOString().slice(0, 10)
  const [{ data: activities }, { data: requests }, { data: dates }] = await Promise.all([
    supabaseAdmin.from('ft_activities').select('*').eq('is_active', true).order('sort'),
    supabaseAdmin
      .from('ft_requests')
      .select(
        'id, activity_id, date, party_size, status, created_at, user:ft_users(name, email), coupon:ft_coupons(code)'
      )
      .gte('date', today),
    supabaseAdmin
      .from('ft_dates')
      .select('activity_id, date, operator_status')
      .gte('date', today),
  ])

  const operator = new Map<string, 'none' | 'approved' | 'rejected'>()
  for (const d of dates ?? []) operator.set(`${d.activity_id}|${d.date}`, d.operator_status)

  const counts = new Map<string, number>()
  const details = new Map<
    string,
    { userName: string | null; userEmail: string | null; partySize: number; couponCode: string | null; createdAt: string }[]
  >()
  for (const r of requests ?? []) {
    if (r.status !== 'active') continue
    const key = `${r.activity_id}|${r.date}`
    counts.set(key, (counts.get(key) ?? 0) + r.party_size)
    const user = r.user as unknown as { name: string; email: string } | null
    const coupon = r.coupon as unknown as { code: string } | null
    const list = details.get(key) ?? []
    list.push({
      userName: user?.name ?? null,
      userEmail: user?.email ?? null,
      partySize: r.party_size,
      couponCode: coupon?.code ?? null,
      createdAt: r.created_at,
    })
    details.set(key, list)
  }

  const rows = []
  for (const [key, count] of counts) {
    const [activityId, date] = key.split('|')
    const activity = (activities ?? []).find((a) => a.id === activityId)
    if (!activity) continue
    rows.push({
      activityId,
      activitySlug: activity.slug,
      activityName: activity.name,
      date,
      count,
      minParticipants: activity.min_participants,
      state: computeOwnState(count, activity.min_participants, operator.get(key) ?? 'none'),
      requests: (details.get(key) ?? []).sort((a, b) =>
        a.createdAt.localeCompare(b.createdAt)
      ),
    })
  }
  rows.sort((a, b) => a.date.localeCompare(b.date))

  return NextResponse.json(rows)
}

const patchSchema = z.object({
  activityId: z.uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  operatorStatus: z.enum(['none', 'approved', 'rejected']),
})

// 日付の管理者判断を更新する（承認 / 受付停止 / 取り消し）
export async function PATCH(req: NextRequest) {
  const denied = requireAdmin(req)
  if (denied) return denied

  const parsed = patchSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: '入力内容を確認してください' }, { status: 400 })
  }
  const { activityId, date, operatorStatus } = parsed.data

  // 承認する場合: 同日に他区分の確定があると二重確定になるためブロック
  if (operatorStatus === 'approved') {
    const [{ data: activities }, { data: requests }, { data: dates }] = await Promise.all([
      supabaseAdmin.from('ft_activities').select('*').eq('is_active', true),
      supabaseAdmin
        .from('ft_requests')
        .select('activity_id, party_size, status')
        .eq('date', date),
      supabaseAdmin.from('ft_dates').select('activity_id, operator_status').eq('date', date),
    ])
    const conflict = (activities ?? []).some((a) => {
      if (a.id === activityId) return false
      const count = (requests ?? [])
        .filter((r) => r.activity_id === a.id && r.status === 'active')
        .reduce((s, r) => s + r.party_size, 0)
      const op =
        (dates ?? []).find((d) => d.activity_id === a.id)?.operator_status ?? 'none'
      return computeOwnState(count, a.min_participants, op) === 'confirmed'
    })
    if (conflict) {
      return NextResponse.json(
        { error: 'この日は別の利用区分がすでに確定しています' },
        { status: 400 }
      )
    }
  }

  const { error } = await supabaseAdmin
    .from('ft_dates')
    .upsert(
      { activity_id: activityId, date, operator_status: operatorStatus },
      { onConflict: 'activity_id,date' }
    )
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
