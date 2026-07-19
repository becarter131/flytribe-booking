import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { mailBody, notifyAdmins, sendMail } from '@/lib/notify'

// 前日リマインダー（Vercel Cron が毎朝9時JSTに実行）。
// 明日が「確定済み」の予約について、申込者と管理者へ案内メールを送る
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // JST基準の「明日」
  const jst = new Date(Date.now() + 9 * 60 * 60 * 1000)
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

  return NextResponse.json({ date: tomorrow, userMails, activities: adminLines.length })
}
