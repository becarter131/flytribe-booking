import { randomInt } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase'
import { getStripe } from '@/lib/stripe'
import { courseItemLabel } from '@/lib/course-labels'

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
        const { data: item } = await supabaseAdmin
          .from('ft_course_items')
          .select('*')
          .eq('id', order.course_item_id)
          .single()
        const { data: courseActivity } = await supabaseAdmin
          .from('ft_activities')
          .select('id')
          .eq('slug', 'course')
          .single()

        // チケットコードを発行（1回分・講座区分専用）
        const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
        const code =
          'FT-' + Array.from({ length: 8 }, () => chars[randomInt(chars.length)]).join('')
        const { data: coupon, error: couponError } = await supabaseAdmin
          .from('ft_coupons')
          .insert({
            code,
            description: item ? `購入チケット: ${courseItemLabel(item)}` : '購入チケット',
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
