import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// 利用券（飛行会・貸切）の商品一覧
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('ft_shop_products')
    .select('*')
    .eq('is_active', true)
    .order('sort')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(
    (data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      activitySlug: p.activity_slug,
      uses: p.uses,
      priceJpy: p.price_jpy,
    }))
  )
}
