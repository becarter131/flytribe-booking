import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// 自分の予約リクエスト一覧
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const userId = sp.get('userId')
  const activitySlug = sp.get('activitySlug')
  if (!userId || !activitySlug) {
    return NextResponse.json({ error: 'userId/activitySlug is required' }, { status: 400 })
  }

  const { data: activity } = await supabaseAdmin
    .from('ft_activities')
    .select('id')
    .eq('slug', activitySlug)
    .single()
  if (!activity) return NextResponse.json({ requests: [] })

  const { data: requests } = await supabaseAdmin
    .from('ft_requests')
    .select('id, date, party_size, status, coupon:ft_coupons(code)')
    .eq('user_id', userId)
    .eq('activity_id', activity.id)
    .order('date')

  return NextResponse.json({
    requests: (requests ?? []).map((r) => ({
      id: r.id,
      date: r.date,
      partySize: r.party_size,
      status: r.status,
      couponCode: (r.coupon as { code: string } | null)?.code ?? null,
    })),
  })
}
