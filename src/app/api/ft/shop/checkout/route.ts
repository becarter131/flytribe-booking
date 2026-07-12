import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase'
import { getStripe } from '@/lib/stripe'
import { courseItemLabel, ITEM_TYPE_LABEL } from '@/lib/course-labels'

const schema = z
  .object({
    basicItemId: z.uuid().optional(),             // 講座チケット: 基本講習
    optionItemIds: z.array(z.uuid()).max(3).optional().default([]), // 限定解除オプション
    shopProductId: z.uuid().optional(),           // 利用券（飛行会・貸切）
    userId: z.uuid(),
  })
  .refine((v) => !!v.basicItemId !== !!v.shopProductId, {
    message: 'basicItemId か shopProductId のどちらか一方を指定してください',
  })

// 講座チケットの購入: 基本講習 + 選択した限定解除オプションをまとめて1回で決済する
export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: '入力内容を確認してください' }, { status: 400 })
  }
  const { basicItemId, optionItemIds, shopProductId, userId } = parsed.data

  const stripe = getStripe()
  if (!stripe) {
    return NextResponse.json({ error: '決済機能が設定されていません' }, { status: 500 })
  }

  const { data: user } = await supabaseAdmin
    .from('ft_users')
    .select('*')
    .eq('id', userId)
    .single()
  if (!user) return NextResponse.json({ error: '利用者登録が必要です' }, { status: 400 })

  const proto0 = req.headers.get('x-forwarded-proto') ?? 'http'
  const origin0 = req.headers.get('origin') ?? `${proto0}://${req.headers.get('host')}`

  // ===== 利用券（飛行会・貸切）の購入 =====
  if (shopProductId) {
    const { data: product } = await supabaseAdmin
      .from('ft_shop_products')
      .select('*')
      .eq('id', shopProductId)
      .eq('is_active', true)
      .single()
    if (!product) return NextResponse.json({ error: '商品が見つかりません' }, { status: 404 })

    const { data: order, error } = await supabaseAdmin
      .from('ft_ticket_orders')
      .insert({
        user_id: userId,
        shop_product_id: product.id,
        price_jpy: product.price_jpy,
      })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: { name: product.name },
            unit_amount: product.price_jpy,
          },
          quantity: 1,
        },
      ],
      customer_email: user.email,
      metadata: { ftTicketOrderId: order.id },
      success_url: `${origin0}/ja/shop/success/${order.id}`,
      cancel_url: `${origin0}/ja/shop`,
    })
    return NextResponse.json({ checkoutUrl: session.url }, { status: 201 })
  }

  // ===== 講座チケット（基本講習 + 限定解除オプション）の購入 =====
  const { data: basic } = await supabaseAdmin
    .from('ft_course_items')
    .select('*')
    .eq('id', basicItemId!)
    .eq('is_active', true)
    .single()
  if (!basic || basic.item_type !== 'basic') {
    return NextResponse.json({ error: '基本講習を選択してください' }, { status: 400 })
  }

  // オプションの検証: 同じ機体・等級・区分の限定解除のみ許可
  const options: typeof basic[] = []
  for (const optionId of optionItemIds) {
    const { data: option } = await supabaseAdmin
      .from('ft_course_items')
      .select('*')
      .eq('id', optionId)
      .eq('is_active', true)
      .single()
    if (
      !option ||
      option.item_type === 'basic' ||
      option.machine !== basic.machine ||
      option.license !== basic.license ||
      option.experience !== basic.experience
    ) {
      return NextResponse.json(
        { error: '選択したオプションはこの基本講習に追加できません' },
        { status: 400 }
      )
    }
    options.push(option)
  }

  const items = [basic, ...options]
  const total = items.reduce((s, i) => s + i.price_jpy, 0)

  const { data: order, error } = await supabaseAdmin
    .from('ft_ticket_orders')
    .insert({
      user_id: userId,
      course_item_id: basic.id,
      price_jpy: total,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await supabaseAdmin.from('ft_ticket_order_items').insert(
    items.map((i) => ({
      order_id: order.id,
      course_item_id: i.id,
      price_jpy: i.price_jpy,
    }))
  )

  const proto = req.headers.get('x-forwarded-proto') ?? 'http'
  const origin = req.headers.get('origin') ?? `${proto}://${req.headers.get('host')}`

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: items.map((i) => ({
      price_data: {
        currency: 'jpy',
        product_data: {
          name:
            i.item_type === 'basic'
              ? `講座チケット: ${courseItemLabel(i)}`
              : `限定解除オプション: ${ITEM_TYPE_LABEL[i.item_type]}`,
        },
        unit_amount: i.price_jpy,
      },
      quantity: 1,
    })),
    customer_email: user.email,
    metadata: { ftTicketOrderId: order.id },
    success_url: `${origin}/ja/shop/success/${order.id}`,
    cancel_url: `${origin}/ja/shop`,
  })

  return NextResponse.json({ checkoutUrl: session.url }, { status: 201 })
}
