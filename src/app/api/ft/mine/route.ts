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
    .select('id, date, party_size, status, coupons:ft_request_coupons(uses, coupon:ft_coupons(code))')
    .eq('user_id', userId)
    .eq('activity_id', activity.id)
    .order('date')

  // 管理者承認済み（確定）の日付を取得し、各予約に反映する
  const { data: approvedDates } = await supabaseAdmin
    .from('ft_dates')
    .select('date')
    .eq('activity_id', activity.id)
    .eq('operator_status', 'approved')
  const approved = new Set((approvedDates ?? []).map((d) => d.date))

  return NextResponse.json({
    requests: (requests ?? []).map((r) => {
      const usedCoupons = (r.coupons ?? []) as unknown as {
        uses: number
        coupon: { code: string } | null
      }[]
      return {
        id: r.id,
        date: r.date,
        partySize: r.party_size,
        status: r.status,
        confirmed: r.status === 'active' && approved.has(r.date),
        couponCodes: usedCoupons
          .filter((c) => c.coupon)
          .map((c) => (c.uses > 1 ? `${c.coupon!.code}×${c.uses}` : c.coupon!.code)),
      }
    }),
  })
}
