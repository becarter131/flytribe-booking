import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { mailBody, notifyAdmins, sendMail } from '@/lib/notify'

// 毎朝9時JSTの定時処理（Vercel Cron）:
// 1. 前日リマインダー: 明日が「確定済み」の予約について、申込者と管理者へ案内メールを送る
// 2. 期限切れ仮予約の整理: 確定しないまま日付が過ぎた申込を受付停止にし、チケットを返却して通知する
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // JST基準の「今日」と「明日」
  const jst = new Date(Date.now() + 9 * 60 * 60 * 1000)
  const todayJst = jst.toISOString().slice(0, 10)
  jst.setUTCDate(jst.getUTCDate() + 1)
  const tomorrow = jst.toISOString().slice(0, 10)

  const { data: dates } = await supabaseAdmin
    .from('ft_dates')
    .select('activity_id, activity:ft_activities(name, slug)')
    .eq('date', tomorrow)
    .eq('operator_status', 'approved')

  let userMails = 0
  const adminLines: string[] = []
  for (const d of dates ?? []) {
    const activity = Array.isArray(d.activity) ? d.activity[0] : d.activity
    const activityName = activity?.name ?? '利用区分'
    const unit = activity?.slug === 'charter' ? '社' : '名'

    const { data: reqs } = await supabaseAdmin
      .from('ft_requests')
      .select('party_size, user:ft_users(name, email)')
      .eq('activity_id', d.activity_id)
      .eq('date', tomorrow)
      .eq('status', 'active')

    let total = 0
    for (const r of reqs ?? []) {
      const user = Array.isArray(r.user) ? r.user[0] : r.user
      total += r.party_size
      if (!user?.email) continue
      await sendMail(
        user.email,
        `【明日のご利用のご案内】${tomorrow} ${activityName}`,
        mailBody([
          `${user.name} 様`,
          '',
          `明日 ${tomorrow} の ${activityName}（${r.party_size}${unit}）のご予約についてご案内します。`,
          '当日は気をつけてお越しください。ご利用をお待ちしております。',
        ])
      )
      userMails++
    }
    if (total > 0) adminLines.push(`・${activityName}: ${total}${unit}`)
  }

  if (adminLines.length > 0) {
    await notifyAdmins(
      `【明日の予約】${tomorrow} の確定済み予約のご確認`,
      mailBody([`明日 ${tomorrow} の確定済み予約は以下のとおりです。`, '', ...adminLines, '', '管理画面: https://flytribe-booking.vercel.app/ja/dashboard'])
    )
  }

  // ===== 期限切れ仮予約の整理 =====
  // 日付が過ぎても確定（approved）しなかった有効な申込を受付停止にし、チケットを返却する。
  // 当日中はまだ承認される可能性があるため対象外（翌日の朝に処理される）
  const { data: pastRequests } = await supabaseAdmin
    .from('ft_requests')
    .select('id, activity_id, date, party_size, user:ft_users(name, email), activity:ft_activities(name)')
    .lt('date', todayJst)
    .eq('status', 'active')

  // 確定済みの区分×日付は除外する（実施済みの予約はそのまま残す）
  const pastKeys = [...new Set((pastRequests ?? []).map((r) => r.date))]
  const { data: approvedDates } = pastKeys.length
    ? await supabaseAdmin
        .from('ft_dates')
        .select('activity_id, date')
        .in('date', pastKeys)
        .eq('operator_status', 'approved')
    : { data: [] }
  const approvedSet = new Set((approvedDates ?? []).map((d) => `${d.activity_id}|${d.date}`))

  let expired = 0
  for (const r of pastRequests ?? []) {
    if (approvedSet.has(`${r.activity_id}|${r.date}`)) continue

    await supabaseAdmin.from('ft_requests').update({ status: 'rejected' }).eq('id', r.id)

    // 使用したチケットの回数を戻す
    const { data: usedCoupons } = await supabaseAdmin
      .from('ft_request_coupons')
      .select('coupon_id, uses')
      .eq('request_id', r.id)
    for (const rc of usedCoupons ?? []) {
      const { data: coupon } = await supabaseAdmin
        .from('ft_coupons')
        .select('remaining_uses')
        .eq('id', rc.coupon_id)
        .single()
      if (coupon) {
        await supabaseAdmin
          .from('ft_coupons')
          .update({ remaining_uses: coupon.remaining_uses + rc.uses })
          .eq('id', rc.coupon_id)
      }
    }

    const user = Array.isArray(r.user) ? r.user[0] : r.user
    const activity = Array.isArray(r.activity) ? r.activity[0] : r.activity
    if (user?.email) {
      await sendMail(
        user.email,
        `【ご予約不成立のお知らせ】${r.date} ${activity?.name ?? '利用区分'}`,
        mailBody([
          `${user.name} 様`,
          '',
          `誠に申し訳ございませんが、${r.date} の ${activity?.name ?? '利用区分'} は最低催行人数に達しなかったため、ご予約は成立せず取り消されました。`,
          'ご使用いただいたチケットはそのまま再利用いただけます（マイチケットからご確認ください）。',
          '別の日程でのご予約をご検討いただけますと幸いです。',
        ])
      )
    }
    expired++
  }

  return NextResponse.json({
    date: tomorrow,
    userMails,
    activities: adminLines.length,
    expired,
  })
}
