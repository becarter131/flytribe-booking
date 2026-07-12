import { randomInt } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase'
import { getStripe } from '@/lib/stripe'
import { courseItemLabel, ITEM_TYPE_LABEL } from '@/lib/course-labels'

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const newCode = () =>
  'FT-' + Array.from({ length: 8 }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join('')

// 支払い済みになった注文に対してチケットコードを発行する
// エラー時は 500 を返して Stripe に自動リトライさせる
async function issueTickets(order: {
  id: string
  course_item_id: string | null
  shop_product_id: string | null
}): Promise<NextResponse> {
  // ===== 利用券（飛行会・貸切）: セットは1回券コードを枚数分発行する =====
  if (order.shop_product_id) {
    const { data: product } = await supabaseAdmin
      .from('ft_shop_products')
      .select('*')
      .eq('id', order.shop_product_id)
      .single()
    const { data: activity } = await supabaseAdmin
      .from('ft_activities')
      .select('id')
      .eq('slug', product?.activity_slug ?? '')
      .single()

    const uses = product?.uses ?? 1
    const rows = Array.from({ length: uses }, () => ({
      code: newCode(),
      description: `購入チケット: ${product?.name ?? '利用券'}`,
      activity_id: activity?.id ?? null,
      remaining_uses: 1,
      ticket_order_id: order.id,
    }))
    const { data: coupons, error: couponError } = await supabaseAdmin
      .from('ft_coupons')
      .insert(rows)
      .select('id')
    if (couponError) {
      return NextResponse.json({ error: couponError.message }, { status: 500 })
    }
    await supabaseAdmin
      .from('ft_ticket_orders')
      .update({ coupon_id: coupons?.[0]?.id ?? null })
      .eq('id', order.id)
    return NextResponse.json({ received: true })
  }

  // ===== 講座チケット: 注文内訳（基本講習 + 限定解除オプション）から説明文を組み立てる =====
  const { data: orderItems } = await supabaseAdmin
    .from('ft_ticket_order_items')
    .select('item:ft_course_items(*)')
    .eq('order_id', order.id)
  const items = (orderItems ?? [])
    .map((r) => r.item as unknown as {
      machine: string
      license: string
      experience: string
      item_type: string
      days: number | null
    } | null)
    .filter((i) => i !== null)
  items.sort((a) => (a!.item_type === 'basic' ? -1 : 1))
  const description =
    items.length > 0
      ? `購入チケット: ${courseItemLabel(items[0]!)}` +
        items
          .slice(1)
          .map((i) => `＋${ITEM_TYPE_LABEL[i!.item_type]}`)
          .join('')
      : '購入チケット'

  const { data: courseActivity } = await supabaseAdmin
    .from('ft_activities')
    .select('id')
    .eq('slug', 'course')
    .single()

  // チケットコードを発行（1回分・講座区分専用・基本+オプションを1枚に統合）
  const { data: coupon, error: couponError } = await supabaseAdmin
    .from('ft_coupons')
    .insert({
      code: newCode(),
      description,
      activity_id: courseActivity?.id ?? null,
      course_item_id: order.course_item_id,
      remaining_uses: 1,
      ticket_order_id: order.id,
    })
    .select('id')
    .single()
  if (couponError) {
    return NextResponse.json({ error: couponError.message }, { status: 500 })
  }
  await supabaseAdmin
    .from('ft_ticket_orders')
    .update({ coupon_id: coupon.id })
    .eq('id', order.id)
  return NextResponse.json({ received: true })
}

// Stripe Webhook: チケット購入の決済完了でチケットコードを発行する
// - カード決済: checkout.session.completed 時点で支払い済み
// - 銀行振込: completed 時点では入金待ち。入金確認後の async_payment_succeeded で発行する
export async function POST(req: NextRequest) {
  const stripe = getStripe()
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!stripe || !secret) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 })
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  const rawBody = await req.text()
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (
    event.type === 'checkout.session.completed' ||
    event.type === 'checkout.session.async_payment_succeeded'
  ) {
    const session = event.data.object
    const orderId = session.metadata?.ftTicketOrderId
    if (!orderId) return NextResponse.json({ received: true })

    const paymentIntentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id

    // 銀行振込の completed は入金待ち: PaymentIntent の記録だけ行い、発行は入金確認後
    if (session.payment_status !== 'paid') {
      if (paymentIntentId) {
        await supabaseAdmin
          .from('ft_ticket_orders')
          .update({ stripe_payment_intent_id: paymentIntentId })
          .eq('id', orderId)
          .eq('status', 'pending')
      }
      return NextResponse.json({ received: true })
    }

    // 二重処理防止: pending の注文のみ paid に更新し、更新できた場合だけ発行する
    const { data: order, error } = await supabaseAdmin
      .from('ft_ticket_orders')
      .update({ status: 'paid', stripe_payment_intent_id: paymentIntentId ?? null })
      .eq('id', orderId)
      .eq('status', 'pending')
      .select('id, user_id, course_item_id, shop_product_id')
      .maybeSingle()

    if (error) {
      // 500 を返すと Stripe が自動リトライする
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (order) return issueTickets(order)
  }

  return NextResponse.json({ received: true })
}
