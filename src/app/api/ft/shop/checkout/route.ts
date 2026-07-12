import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase'
import { getStripe } from '@/lib/stripe'
import { courseItemLabel } from '@/lib/course-labels'

const schema = z.object({
  courseItemId: z.uuid(),
  userId: z.uuid(),
})

// 講座チケットの購入: Stripe Checkout で決済し、完了時に webhook でチケットコードを発行する
export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: '入力内容を確認してください' }, { status: 400 })
  }
  const { courseItemId, userId } = parsed.data

  const stripe = getStripe()
  if (!stripe) {
    return NextResponse.json({ error: '決済機能が設定されていません' }, { status: 500 })
  }

  const [{ data: item }, { data: user }] = await Promise.all([
    supabaseAdmin
      .from('ft_course_items')
      .select('*')
      .eq('id', courseItemId)
      .eq('is_active', true)
      .single(),
    supabaseAdmin.from('ft_users').select('*').eq('id', userId).single(),
  ])
  if (!item) return NextResponse.json({ error: 'チケットが見つかりません' }, { status: 404 })
  if (!user) return NextResponse.json({ error: '利用者登録が必要です' }, { status: 400 })

  const { data: order, error } = await supabaseAdmin
    .from('ft_ticket_orders')
    .insert({
      user_id: userId,
      course_item_id: courseItemId,
      price_jpy: item.price_jpy,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const proto = req.headers.get('x-forwarded-proto') ?? 'http'
  const origin = req.headers.get('origin') ?? `${proto}://${req.headers.get('host')}`

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'jpy',
          product_data: { name: `講座チケット: ${courseItemLabel(item)}` },
          unit_amount: item.price_jpy,
        },
        quantity: 1,
      },
    ],
    customer_email: user.email,
    metadata: { ftTicketOrderId: order.id },
    success_url: `${origin}/ja/shop/success/${order.id}`,
    cancel_url: `${origin}/ja/shop`,
  })

  return NextResponse.json({ checkoutUrl: session.url }, { status: 201 })
}
