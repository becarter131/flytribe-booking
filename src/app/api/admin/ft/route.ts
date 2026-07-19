import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'
import { computeOwnState } from '@/lib/ft'
import { mailBody, notifyAdmins, sendMail } from '@/lib/notify'

// 予約リクエストのある日付の一覧（管理者用）
export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  const today = new Date().toISOString().slice(0, 10)
  const [{ data: activities }, { data: requests }, { data: dates }] = await Promise.all([
    supabaseAdmin.from('ft_activities').select('*').eq('is_active', true).order('sort'),
    supabaseAdmin
      .from('ft_requests')
      .select(
        'id, activity_id, date, party_size, status, created_at, user:ft_users(name, email, phone), coupons:ft_request_coupons(uses, coupon:ft_coupons(code))'
      )
      .gte('date', today),
    supabaseAdmin
      .from('ft_dates')
      .select('activity_id, date, operator_status')
      .gte('date', today),
  ])

  const operator = new Map<string, 'none' | 'approved' | 'rejected'>()
  for (const d of dates ?? []) operator.set(`${d.activity_id}|${d.date}`, d.operator_status)

  // 受付停止（rejected）の申込もグレーアウト表示するため行に含める。
  // ユーザー都合キャンセル（cancelled）は表示しない
  const counts = new Map<string, number>()
  const keys = new Set<string>()
  const details = new Map<
    string,
    { userName: string | null; userEmail: string | null; userPhone: string | null; partySize: number; couponCodes: string[]; createdAt: string; status: string }[]
  >()
  for (const r of requests ?? []) {
    if (r.status === 'cancelled') continue
    const key = `${r.activity_id}|${r.date}`
    keys.add(key)
    // 人数（催行判定）は有効な申込のみカウント
    if (r.status === 'active') counts.set(key, (counts.get(key) ?? 0) + r.party_size)
    const user = r.user as unknown as { name: string; email: string; phone: string | null } | null
    const usedCoupons = (r.coupons ?? []) as unknown as {
      uses: number
      coupon: { code: string } | null
    }[]
    const list = details.get(key) ?? []
    list.push({
      userName: user?.name ?? null,
      userEmail: user?.email ?? null,
      userPhone: user?.phone ?? null,
      partySize: r.party_size,
      couponCodes: usedCoupons
        .filter((c) => c.coupon)
        .map((c) => (c.uses > 1 ? `${c.coupon!.code}×${c.uses}` : c.coupon!.code)),
      createdAt: r.created_at,
      status: r.status,
    })
    details.set(key, list)
  }

  const rows = []
  for (const key of keys) {
    const count = counts.get(key) ?? 0
    const [activityId, date] = key.split('|')
    const activity = (activities ?? []).find((a) => a.id === activityId)
    if (!activity) continue
    rows.push({
      activityId,
      activitySlug: activity.slug,
      activityName: activity.name,
      date,
      count,
      minParticipants: activity.min_participants,
      state: computeOwnState(count, activity.min_participants, operator.get(key) ?? 'none'),
      requests: (details.get(key) ?? []).sort((a, b) =>
        a.createdAt.localeCompare(b.createdAt)
      ),
    })
  }
  rows.sort((a, b) => a.date.localeCompare(b.date))

  return NextResponse.json(rows)
}

const patchSchema = z.object({
  activityId: z.uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  operatorStatus: z.enum(['none', 'approved', 'rejected']),
  // 受付停止・取り消しの範囲: activity=対象の区分のみ（予約一覧） / date=全区分一括（カレンダー）
  scope: z.enum(['activity', 'date']).optional().default('activity'),
})

// 日付の管理者判断を更新する（承認 / 受付停止 / 取り消し）
export async function PATCH(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  const parsed = patchSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: '入力内容を確認してください' }, { status: 400 })
  }
  const { activityId, date, operatorStatus, scope } = parsed.data

  // 承認する場合: 最低催行人数チェック + 同日に他区分の確定があると二重確定になるためブロック
  if (operatorStatus === 'approved') {
    const [{ data: activities }, { data: requests }, { data: dates }] = await Promise.all([
      supabaseAdmin.from('ft_activities').select('*').eq('is_active', true),
      supabaseAdmin
        .from('ft_requests')
        .select('activity_id, party_size, status')
        .eq('date', date),
      supabaseAdmin.from('ft_dates').select('activity_id, operator_status').eq('date', date),
    ])
    const countOf = (id: string) =>
      (requests ?? [])
        .filter((r) => r.activity_id === id && r.status === 'active')
        .reduce((s, r) => s + r.party_size, 0)

    const own = (activities ?? []).find((a) => a.id === activityId)
    if (own && countOf(activityId) < own.min_participants) {
      const unit = own.slug === 'charter' ? '社' : '名'
      return NextResponse.json(
        {
          error: `最低催行人数（${own.min_participants}${unit}）に達していないため確定にできません`,
        },
        { status: 400 }
      )
    }

    const conflict = (activities ?? []).some((a) => {
      if (a.id === activityId) return false
      const op =
        (dates ?? []).find((d) => d.activity_id === a.id)?.operator_status ?? 'none'
      return computeOwnState(countOf(a.id), a.min_participants, op) === 'confirmed'
    })
    if (conflict) {
      return NextResponse.json(
        { error: 'この日は別の利用区分がすでに確定しています' },
        { status: 400 }
      )
    }
  }

  // ===== 確定（対象の区分のみ） =====
  if (operatorStatus === 'approved') {
    const { error } = await supabaseAdmin
      .from('ft_dates')
      .upsert(
        { activity_id: activityId, date, operator_status: 'approved' },
        { onConflict: 'activity_id,date' }
      )
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    const { data: targetActivity } = await supabaseAdmin
      .from('ft_activities')
      .select('name')
      .eq('id', activityId)
      .single()
    const activityName = targetActivity?.name ?? '利用区分'

    // その日の申込者全員へ確定メールを送る
    const { data: confirmed } = await supabaseAdmin
      .from('ft_requests')
      .select('party_size, user:ft_users(name, email)')
      .eq('activity_id', activityId)
      .eq('date', date)
      .eq('status', 'active')
    let totalCount = 0
    for (const r of confirmed ?? []) {
      totalCount += r.party_size
      const user = r.user as unknown as { name: string; email: string } | null
      if (!user?.email) continue
      await sendMail(
        user.email,
        `【予約が確定しました】${date} ${activityName}`,
        mailBody([
          `${user.name} 様`,
          '',
          `${date} の ${activityName} のご予約が確定しました。`,
          '当日のご利用をお待ちしております。',
        ])
      )
    }

    // 管理者全員へも確定を共有する
    const { data: approvedActivity } = await supabaseAdmin
      .from('ft_activities')
      .select('slug')
      .eq('id', activityId)
      .single()
    const unit = approvedActivity?.slug === 'charter' ? '社' : '名'
    await notifyAdmins(
      `【予約確定】${date} ${activityName}（${totalCount}${unit}）`,
      mailBody([
        `${date} の ${activityName} が予約確定になりました。`,
        '',
        `確定人数: ${totalCount}${unit}（申込 ${(confirmed ?? []).length}件）`,
        '申込者全員へ確定の通知を送信済みです。',
        '',
        '⚠️ 同じ日付に他の申し込みが残っている場合は、必ず受付停止にしてください。',
        '管理画面: https://flytribe-booking.vercel.app/ja/dashboard',
      ])
    )
    return NextResponse.json({ ok: true })
  }

  // ===== 受付停止 =====
  // scope=date: 全区分一括（カレンダーの「この日を受付停止」）
  // scope=activity: 対象の区分のみ（予約一覧の個別停止。他区分の確定・申込には影響しない）
  if (operatorStatus === 'rejected') {
    const { data: allActivities } = await supabaseAdmin
      .from('ft_activities')
      .select('id, name')
      .eq('is_active', true)
    const nameOf = new Map((allActivities ?? []).map((a) => [a.id, a.name as string]))
    const targets =
      scope === 'date'
        ? (allActivities ?? [])
        : (allActivities ?? []).filter((a) => a.id === activityId)
    if (targets.length === 0) {
      return NextResponse.json({ error: '対象の利用区分が見つかりません' }, { status: 400 })
    }
    const targetIds = targets.map((a) => a.id)

    const { error } = await supabaseAdmin.from('ft_dates').upsert(
      targets.map((a) => ({
        activity_id: a.id,
        date,
        operator_status: 'rejected',
      })),
      { onConflict: 'activity_id,date' }
    )
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    // 対象区分の申込を「受付停止」扱いにし、使用済みチケットの回数を戻す
    const { data: affected } = await supabaseAdmin
      .from('ft_requests')
      .select('id, activity_id, user:ft_users(name, email)')
      .eq('date', date)
      .eq('status', 'active')
      .in('activity_id', targetIds)
    for (const r of affected ?? []) {
      await supabaseAdmin.from('ft_requests').update({ status: 'rejected' }).eq('id', r.id)
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
      const user = r.user as unknown as { name: string; email: string } | null
      if (user?.email) {
        const activityName = nameOf.get(r.activity_id) ?? '利用区分'
        await sendMail(
          user.email,
          `【受付停止のお知らせ】${date} ${activityName}`,
          mailBody([
            `${user.name} 様`,
            '',
            `誠に申し訳ございませんが、${date} の ${activityName} は受付停止となり、ご予約は取り消されました。`,
            'ご使用いただいたチケットはそのまま再利用いただけます（マイチケットからご確認ください）。',
            '別の日程でのご予約をご検討いただけますと幸いです。',
          ])
        )
      }
    }

    // 管理者全員へも通知（誰かが停止したことを共有する）
    const stoppedNames = targets.map((a) => a.name).join('・')
    await notifyAdmins(
      `【受付停止】${date} ${stoppedNames}`,
      mailBody([
        `${date} の ${stoppedNames} が受付停止になりました。`,
        '',
        `対象範囲: ${scope === 'date' ? '全区分一括（カレンダーから）' : 'この区分のみ（予約一覧から）'}`,
        `取り消された申込: ${(affected ?? []).length}件（チケットは自動返却済み・申込者へは通知済み）`,
        '',
        '管理画面: https://flytribe-booking.vercel.app/ja/dashboard',
      ])
    )
    return NextResponse.json({ ok: true })
  }

  // ===== 停止の取り消し（受付停止のみ解除。確定は変更しない） =====
  // scope=date: 全区分 / scope=activity: 対象の区分のみ
  let lift = supabaseAdmin
    .from('ft_dates')
    .update({ operator_status: 'none' })
    .eq('date', date)
    .eq('operator_status', 'rejected')
  if (scope === 'activity') lift = lift.eq('activity_id', activityId)
  const { error } = await lift
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
