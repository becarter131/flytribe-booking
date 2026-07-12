import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase'

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
    .select('id, status, coupon_id')
    .eq('id', requestId)
    .eq('user_id', userId)
    .single()
  if (!request) return NextResponse.json({ error: '予約が見つかりません' }, { status: 404 })
  if (request.status === 'cancelled') {
    return NextResponse.json({ error: 'すでにキャンセル済みです' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('ft_requests')
    .update({ status: 'cancelled' })
    .eq('id', requestId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // クーポンを使っていた場合は使用回数を戻す
  if (request.coupon_id) {
    const { data: coupon } = await supabaseAdmin
      .from('ft_coupons')
      .select('remaining_uses')
      .eq('id', request.coupon_id)
      .single()
    if (coupon) {
      await supabaseAdmin
        .from('ft_coupons')
        .update({ remaining_uses: coupon.remaining_uses + 1 })
        .eq('id', request.coupon_id)
    }
  }

  return NextResponse.json({ cancelled: true })
}
