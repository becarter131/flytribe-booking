import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase'
import { mailBody, notifyAdmins } from '@/lib/notify'

const schema = z.object({
  requestId: z.uuid(),
  userId: z.uuid(),
})

// 自分の予約リクエストをキャンセルする
export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: '入力内容を確認してください' }, { status: 400 })
  }
  const { requestId, userId } = parsed.data

  const { data: request } = await supabaseAdmin
    .from('ft_requests')
    .select('id, status, coupon_id, activity_id, date, party_size, user:ft_users(name, email), activity:ft_activities(name, slug)')
    .eq('id', requestId)
    .eq('user_id', userId)
    .single()
  if (!request) return NextResponse.json({ error: '予約が見つかりません' }, { status: 404 })
  if (request.status === 'cancelled') {
    return NextResponse.json({ error: 'すでにキャンセル済みです' }, { status: 400 })
  }
  // 受付停止時にチケット回数は返却済みのため、二重返却を防ぐ
  if (request.status === 'rejected') {
    return NextResponse.json(
      { error: 'この予約は受付停止により取り消し済みです（チケットは再利用できます）' },
      { status: 400 }
    )
  }
  // 管理者承認済み（確定）の日はキャンセル不可
  const { data: dateRow } = await supabaseAdmin
    .from('ft_dates')
    .select('operator_status')
    .eq('activity_id', request.activity_id)
    .eq('date', request.date)
    .maybeSingle()
  if (dateRow?.operator_status === 'approved') {
    return NextResponse.json(
      { error: '確定済みの予約はキャンセルできません' },
      { status: 400 }
    )
  }

  const { error } = await supabaseAdmin
    .from('ft_requests')
    .update({ status: 'cancelled' })
    .eq('id', requestId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // 使用したチケットの回数をすべて戻す
  const { data: usedCoupons } = await supabaseAdmin
    .from('ft_request_coupons')
    .select('coupon_id, uses')
    .eq('request_id', requestId)
  for (const rc of usedCoupons ?? []) {
    const { data: coupon } = await supabaseAdmin
      .from('ft_coupons')
      .select('remaining_uses')
      .eq('id', rc.coupon_id)
      .single()
    if (coupon) {
      await supabaseAdmin
        .from('ft_coupons')
        .update({ remaining_uses: coupon.remaining_uses + rc.uses })
        .eq('id', rc.coupon_id)
    }
  }

  // 管理者へ通知（確定前の利用者都合キャンセル）
  const cancelUser = Array.isArray(request.user) ? request.user[0] : request.user
  const activity = Array.isArray(request.activity) ? request.activity[0] : request.activity
  const unit = activity?.slug === 'charter' ? '社' : '名'
  await notifyAdmins(
    `【申込キャンセル】${request.date} ${activity?.name ?? '利用区分'}（${request.party_size}${unit}）`,
    mailBody([
      '利用者により予約申込がキャンセルされました（確定前）。',
      '',
      `日付: ${request.date}`,
      `利用区分: ${activity?.name ?? '-'}`,
      `申込者: ${cancelUser?.name ?? '不明'}（${cancelUser?.email ?? '-'}）`,
      `人数: ${request.party_size}${unit}`,
      '',
      '使用されていたチケットは自動返却されています。',
      '管理画面: https://flytribe-booking.vercel.app/ja/dashboard',
    ])
  )

  return NextResponse.json({ cancelled: true })
}
