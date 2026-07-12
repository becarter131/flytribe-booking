import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

interface CouponRow {
  id: string
  code: string
  description: string | null
  remaining_uses: number
  is_active: boolean
  ticket_order_id: string | null
  activity: { name: string; slug: string } | null
}

const COUPON_SELECT =
  'id, code, description, remaining_uses, is_active, ticket_order_id, activity:ft_activities(name, slug)'

// 自分のチケットコード一覧
// 対象: ショップで購入したもの + 予約で使用したことのあるもの（受付停止で戻ったチケットを含む）
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 })

  const [{ data: orders }, { data: myRequests }] = await Promise.all([
    supabaseAdmin
      .from('ft_ticket_orders')
      .select('id, created_at')
      .eq('user_id', userId)
      .eq('status', 'paid'),
    supabaseAdmin
      .from('ft_requests')
      .select('coupon_id')
      .eq('user_id', userId)
      .not('coupon_id', 'is', null),
  ])
  const orderIds = (orders ?? []).map((o) => o.id)
  const orderedAt = new Map((orders ?? []).map((o) => [o.id, o.created_at]))
  const usedCouponIds = [...new Set((myRequests ?? []).map((r) => r.coupon_id as string))]

  const couponMap = new Map<string, CouponRow>()
  if (orderIds.length > 0) {
    const { data } = await supabaseAdmin
      .from('ft_coupons')
      .select(COUPON_SELECT)
      .in('ticket_order_id', orderIds)
    for (const c of (data ?? []) as unknown as CouponRow[]) couponMap.set(c.id, c)
  }
  if (usedCouponIds.length > 0) {
    const { data } = await supabaseAdmin
      .from('ft_coupons')
      .select(COUPON_SELECT)
      .in('id', usedCouponIds)
    for (const c of (data ?? []) as unknown as CouponRow[]) couponMap.set(c.id, c)
  }

  const tickets = [...couponMap.values()].map((c) => ({
    code: c.code,
    label: c.description?.replace(/^購入チケット: /, '') ?? 'チケット',
    activityName: c.activity?.name ?? null,
    activitySlug: c.activity?.slug ?? null,
    remainingUses: c.remaining_uses,
    isActive: c.is_active,
    purchasedAt: c.ticket_order_id ? (orderedAt.get(c.ticket_order_id) ?? null) : null,
  }))
  // 未使用を先頭に、購入日の新しい順に並べる
  tickets.sort((a, b) => {
    const aUsable = a.isActive && a.remainingUses > 0 ? 0 : 1
    const bUsable = b.isActive && b.remainingUses > 0 ? 0 : 1
    if (aUsable !== bUsable) return aUsable - bUsable
    return (b.purchasedAt ?? '').localeCompare(a.purchasedAt ?? '')
  })

  return NextResponse.json(tickets)
}
