import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// 国家資格講座のコース内容・料金一覧（フィルタリングはクライアント側で行う）
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('ft_course_items')
    .select('*')
    .eq('is_active', true)
    .order('sort')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(
    (data ?? []).map((i) => ({
      id: i.id,
      machine: i.machine,
      license: i.license,
      experience: i.experience,
      itemType: i.item_type,
      days: i.days,
      priceJpy: i.price_jpy,
    }))
  )
}
