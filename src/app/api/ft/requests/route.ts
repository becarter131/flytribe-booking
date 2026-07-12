import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase'
import { applyCrossBlock, computeOwnState } from '@/lib/ft'

const schema = z.object({
  activitySlug: z.string().min(1).max(30),
  userId: z.uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  partySize: z.number().int().min(1).max(30),
  couponCode: z.string().max(30).optional(),
})

// 予約リクエストを登録する（他区分で確定済みの日は不可）
export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: '入力内容を確認してください' }, { status: 400 })
  }
  const { activitySlug, userId, date, partySize, couponCode } = parsed.data

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (new Date(`${date}T00:00:00`) < today) {
    return NextResponse.json({ error: '過去の日付は予約できません' }, { status: 400 })
  }

  const { data: activities } = await supabaseAdmin
    .from('ft_activities')
    .select('*')
    .eq('is_active', true)
  const activity = (activities ?? []).find((a) => a.slug === activitySlug)
  if (!activity) return NextResponse.json({ error: '利用区分が見つかりません' }, { status: 404 })

  // 全区分の同日の状態を計算し、この区分が予約可能か検証する
  const [{ data: requests }, { data: dates }] = await Promise.all([
    supabaseAdmin
      .from('ft_requests')
      .select('activity_id, party_size, status')
      .eq('date', date),
    supabaseAdmin.from('ft_dates').select('activity_id, operator_status').eq('date', date),
  ])
  const countOf = (activityId: string) =>
    (requests ?? [])
      .filter((r) => r.activity_id === activityId && r.status === 'active')
      .reduce((s, r) => s + r.party_size, 0)
  const operatorOf = (activityId: string) =>
    (dates ?? []).find((d) => d.activity_id === activityId)?.operator_status ?? 'none'

  const ownState = computeOwnState(
    countOf(activity.id),
    activity.min_participants,
    operatorOf(activity.id)
  )
  const anyOtherConfirmed = (activities ?? []).some(
    (a) =>
      a.id !== activity.id &&
      computeOwnState(countOf(a.id), a.min_participants, operatorOf(a.id)) === 'confirmed'
  )
  const state = applyCrossBlock(ownState, anyOtherConfirmed)

  if (state === 'occupied') {
    return NextResponse.json(
      { error: 'この日は別の利用区分で確定済みのため予約できません' },
      { status: 400 }
    )
  }
  if (state === 'rejected') {
    return NextResponse.json({ error: 'この日は受付を停止しています' }, { status: 400 })
  }

  const current = countOf(activity.id)
  if (activity.max_participants && current + partySize > activity.max_participants) {
    return NextResponse.json(
      { error: `この日の残り枠は ${activity.max_participants - current} 名です` },
      { status: 400 }
    )
  }

  // クーポンの検証（有効・残回数あり・区分が一致 or 全区分共通）
  let couponId: string | null = null
  if (couponCode) {
    const { data: coupon } = await supabaseAdmin
      .from('ft_coupons')
      .select('*')
      .eq('code', couponCode.trim().toUpperCase())
      .maybeSingle()
    if (!coupon || !coupon.is_active) {
      return NextResponse.json({ error: 'クーポンコードが無効です' }, { status: 400 })
    }
    if (coupon.activity_id && coupon.activity_id !== activity.id) {
      return NextResponse.json(
        { error: 'このクーポンは別の利用区分専用です' },
        { status: 400 }
      )
    }
    if (coupon.remaining_uses <= 0) {
      return NextResponse.json({ error: 'このクーポンは使用回数の上限に達しています' }, { status: 400 })
    }
    couponId = coupon.id
  }

  const { error } = await supabaseAdmin.from('ft_requests').insert({
    activity_id: activity.id,
    date,
    user_id: userId,
    party_size: partySize,
    coupon_id: couponId,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // クーポンの使用回数を消費（1リクエスト = 1回）
  if (couponId) {
    const { data: coupon } = await supabaseAdmin
      .from('ft_coupons')
      .select('remaining_uses')
      .eq('id', couponId)
      .single()
    if (coupon) {
      await supabaseAdmin
        .from('ft_coupons')
        .update({ remaining_uses: Math.max(0, coupon.remaining_uses - 1) })
        .eq('id', couponId)
    }
  }

  const newState = applyCrossBlock(
    computeOwnState(current + partySize, activity.min_participants, operatorOf(activity.id)),
    anyOtherConfirmed
  )
  return NextResponse.json({ date, count: current + partySize, state: newState }, { status: 201 })
}
