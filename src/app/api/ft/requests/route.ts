import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase'
import { applyCrossBlock, computeOwnState } from '@/lib/ft'
import { mailBody, notifyAdmins, sendMail } from '@/lib/notify'

const schema = z.object({
  activitySlug: z.string().min(1).max(30),
  userId: z.uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  partySize: z.number().int().min(1).max(30),
  couponCodes: z.array(z.string().min(1).max(30)).max(30).optional(), // 人数分のチケットコード
  couponCode: z.string().max(30).optional(), // 旧形式（互換用）
})

// 予約リクエストを登録する（他区分で確定済みの日は不可）
export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: '入力内容を確認してください' }, { status: 400 })
  }
  const { activitySlug, userId, date, partySize, couponCodes, couponCode } = parsed.data

  // チケットコードは全区分で必須（人数分）
  const codes = (couponCodes ?? (couponCode ? [couponCode] : []))
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean)
  if (codes.length !== partySize) {
    return NextResponse.json(
      { error: '人数分のチケットコードを入力してください' },
      { status: 400 }
    )
  }

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
  const unit = activity.slug === 'charter' ? '社' : '名'
  if (activity.max_participants && current + partySize > activity.max_participants) {
    return NextResponse.json(
      { error: `この日の残り枠は ${activity.max_participants - current} ${unit}です` },
      { status: 400 }
    )
  }

  // チケットの検証（有効・期限内・残回数あり・区分が一致 or 全区分共通）
  // 同じコードを複数人分入力した場合は、残回数がその分あるかを確認する
  const qtyByCode = new Map<string, number>()
  for (const c of codes) qtyByCode.set(c, (qtyByCode.get(c) ?? 0) + 1)
  const now = new Date()
  const consumptions: { couponId: string; remaining: number; uses: number }[] = []
  for (const [code, uses] of qtyByCode) {
    const { data: coupon } = await supabaseAdmin
      .from('ft_coupons')
      .select('*')
      .eq('code', code)
      .maybeSingle()
    if (!coupon || !coupon.is_active) {
      return NextResponse.json({ error: `チケットコード ${code} は無効です` }, { status: 400 })
    }
    if (coupon.expires_at && new Date(coupon.expires_at) < now) {
      return NextResponse.json(
        { error: `チケットコード ${code} は有効期限が切れています` },
        { status: 400 }
      )
    }
    if (coupon.activity_id && coupon.activity_id !== activity.id) {
      return NextResponse.json(
        { error: `チケットコード ${code} は別の利用区分専用です` },
        { status: 400 }
      )
    }
    if (coupon.remaining_uses < uses) {
      return NextResponse.json(
        { error: `チケットコード ${code} の残り回数が足りません（残り${coupon.remaining_uses}回）` },
        { status: 400 }
      )
    }
    consumptions.push({ couponId: coupon.id, remaining: coupon.remaining_uses, uses })
  }

  const { data: request, error } = await supabaseAdmin
    .from('ft_requests')
    .insert({
      activity_id: activity.id,
      date,
      user_id: userId,
      party_size: partySize,
    })
    .select('id')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // 使用チケットを記録し、回数を消費（1名 = 1回）
  await supabaseAdmin.from('ft_request_coupons').insert(
    consumptions.map((c) => ({
      request_id: request.id,
      coupon_id: c.couponId,
      uses: c.uses,
    }))
  )
  for (const c of consumptions) {
    await supabaseAdmin
      .from('ft_coupons')
      .update({ remaining_uses: Math.max(0, c.remaining - c.uses) })
      .eq('id', c.couponId)
  }

  // 申込者と管理者へメール通知（未設定なら何もしない）
  const { data: user } = await supabaseAdmin
    .from('ft_users')
    .select('name, email, phone')
    .eq('id', userId)
    .single()
  const unitLabel = `${partySize}${unit}`
  if (user?.email) {
    await sendMail(
      user.email,
      `【予約申込を受け付けました】${date} ${activity.name}`,
      mailBody([
        `${user.name} 様`,
        '',
        '以下の内容で予約申込を受け付けました。',
        '',
        `日付: ${date}`,
        `利用区分: ${activity.name}`,
        `人数: ${unitLabel}`,
        '',
        '現時点では仮予約です。管理者の承認により予約が確定した際は、あらためてご連絡します。',
      ])
    )
  }
  await notifyAdmins(
    `【新規申込】${date} ${activity.name}（${unitLabel}）`,
    mailBody([
      '新しい予約申込がありました。',
      '',
      `日付: ${date}`,
      `利用区分: ${activity.name}`,
      `申込者: ${user?.name ?? '不明'}（${user?.email ?? '-'} / ${user?.phone ?? '-'}）`,
      `人数: ${unitLabel}`,
      `この日の合計: ${current + partySize}${unit}（確定の目安: ${activity.min_participants}${unit}〜）`,
      '',
      '管理画面: https://flytribe-booking.vercel.app/ja/dashboard',
    ])
  )

  const newState = applyCrossBlock(
    computeOwnState(current + partySize, activity.min_participants, operatorOf(activity.id)),
    anyOtherConfirmed
  )
  return NextResponse.json({ date, count: current + partySize, state: newState }, { status: 201 })
}
