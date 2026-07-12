import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// 自分が購入したチケットコードの一覧（注文経由で紐付いたもの）
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 })

  const { data: orders } = await supabaseAdmin
    .from('ft_ticket_orders')
    .select('id, created_at')
    .eq('user_id', userId)
    .eq('status', 'paid')
  const orderIds = (orders ?? []).map((o) => o.id)
  if (orderIds.length === 0) return NextResponse.json([])
  const orderedAt = new Map((orders ?? []).map((o) => [o.id, o.created_at]))

  const { data: coupons, error } = await supabaseAdmin
    .from('ft_coupons')
    .select('code, description, remaining_uses, is_active, ticket_order_id, activity:ft_activities(name, slug)')
    .in('ticket_order_id', orderIds)
    .order('code')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const tickets = (coupons ?? []).map((c) => {
    const activity = c.activity as unknown as { name: string; slug: string } | null
    return {
      code: c.code,
      label: (c.description as string | null)?.replace(/^購入チケット: /, '') ?? 'チケット',
      activityName: activity?.name ?? null,
      activitySlug: activity?.slug ?? null,
      remainingUses: c.remaining_uses as number,
      isActive: c.is_active as boolean,
      purchasedAt: orderedAt.get(c.ticket_order_id as string) ?? null,
    }
  })
  // 未使用を先頭に、購入日の新しい順に並べる
  tickets.sort((a, b) => {
    const aUsable = a.isActive && a.remainingUses > 0 ? 0 : 1
    const bUsable = b.isActive && b.remainingUses > 0 ? 0 : 1
    if (aUsable !== bUsable) return aUsable - bUsable
    return (b.purchasedAt ?? '').localeCompare(a.purchasedAt ?? '')
  })

  return NextResponse.json(tickets)
}
