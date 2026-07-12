import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { courseItemLabel } from '@/lib/course-labels'

// チケット購入注文の状態と発行済みコード（決済完了ページのポーリング用）
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { data: order } = await supabaseAdmin
    .from('ft_ticket_orders')
    .select('id, status, price_jpy, coupon_id, item:ft_course_items(*)')
    .eq('id', id)
    .single()
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let code: string | null = null
  if (order.coupon_id) {
    const { data: coupon } = await supabaseAdmin
      .from('ft_coupons')
      .select('code')
      .eq('id', order.coupon_id)
      .single()
    code = coupon?.code ?? null
  }

  const item = order.item as unknown as {
    machine: string
    license: string
    experience: string
    item_type: string
    days: number | null
  } | null

  return NextResponse.json({
    status: order.status,
    priceJpy: order.price_jpy,
    itemLabel: item ? courseItemLabel(item) : null,
    ticketCode: code,
  })
}
