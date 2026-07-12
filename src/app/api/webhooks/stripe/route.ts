import { randomInt } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase'
import { getStripe } from '@/lib/stripe'
import { courseItemLabel, ITEM_TYPE_LABEL } from '@/lib/course-labels'

// Stripe Webhook: チケット購入の決済完了でチケットコードを発行する
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

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const orderId = session.metadata?.ftTicketOrderId
    const paymentIntentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id

    if (orderId && paymentIntentId) {
      // 二重処理防止: pending の注文のみ処理する
      const { data: order, error } = await supabaseAdmin
        .from('ft_ticket_orders')
        .update({ status: 'paid', stripe_payment_intent_id: paymentIntentId })
        .eq('id', orderId)
        .eq('status', 'pending')
        .select('id, user_id, course_item_id')
        .single()

      if (error) {
        // 500 を返すと Stripe が自動リトライする
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      if (order) {
        // 注文内訳（基本講習 + 限定解除オプション）からチケットの説明文を組み立てる
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
        const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
        const code =
          'FT-' + Array.from({ length: 8 }, () => chars[randomInt(chars.length)]).join('')
        const { data: coupon, error: couponError } = await supabaseAdmin
          .from('ft_coupons')
          .insert({
            code,
            description,
            activity_id: courseActivity?.id ?? null,
            course_item_id: order.course_item_id,
            remaining_uses: 1,
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
      }
    }
  }

  return NextResponse.json({ received: true })
}
