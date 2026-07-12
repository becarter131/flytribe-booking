import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

interface CouponRow {
  id: string
  code: string
  description: string | null
  remaining_uses: number
  is_active: boolean
  ticket_order_id: string | null
  created_at: string
  expires_at: string | null
  activity: { name: string; slug: string } | null
}

const COUPON_SELECT =
  'id, code, description, remaining_uses, is_active, ticket_order_id, created_at, expires_at, activity:ft_activities(name, slug)'

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
    supabaseAdmin.from('ft_requests').select('id').eq('user_id', userId),
  ])
  const orderIds = (orders ?? []).map((o) => o.id)
  const requestIds = (myRequests ?? []).map((r) => r.id)

  // 予約で使用したチケットのID
  let usedCouponIds: string[] = []
  if (requestIds.length > 0) {
    const { data: rcs } = await supabaseAdmin
      .from('ft_request_coupons')
      .select('coupon_id')
      .in('request_id', requestIds)
    usedCouponIds = [...new Set((rcs ?? []).map((rc) => rc.coupon_id as string))]
  }

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

  const now = new Date()
  const tickets = [...couponMap.values()].map((c) => ({
    code: c.code,
    label: c.description?.replace(/^購入チケット: /, '') ?? 'チケット',
    activityName: c.activity?.name ?? null,
    activitySlug: c.activity?.slug ?? null,
    remainingUses: c.remaining_uses,
    isActive: c.is_active,
    issuedAt: c.created_at,
    expiresAt: c.expires_at,
    expired: c.expires_at != null && new Date(c.expires_at) < now,
  }))
  // 利用可能なものを先頭に、発行日の新しい順に並べる
  tickets.sort((a, b) => {
    const aUsable = a.isActive && a.remainingUses > 0 && !a.expired ? 0 : 1
    const bUsable = b.isActive && b.remainingUses > 0 && !b.expired ? 0 : 1
    if (aUsable !== bUsable) return aUsable - bUsable
    return (b.issuedAt ?? '').localeCompare(a.issuedAt ?? '')
  })

  return NextResponse.json(tickets)
}
