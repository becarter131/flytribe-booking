import { randomBytes } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase'
import { mailBody, sendMail } from '@/lib/notify'

const schema = z.object({
  email: z.email(),
  kind: z.enum(['user', 'admin']).optional().default('user'),
})

// パスワード再設定の申請。登録済みメールなら再設定リンクを送る。
// アカウントの有無を推測されないよう、結果に関わらず常に同じ応答を返す
export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'メールアドレスを入力してください' }, { status: 400 })
  }
  const { email, kind } = parsed.data
  const ok = NextResponse.json({
    ok: true,
    message: '登録済みのメールアドレスであれば、再設定リンクをお送りしました。メールをご確認ください',
  })

  const table = kind === 'admin' ? 'ft_admins' : 'ft_users'
  const { data: account } = await supabaseAdmin
    .from(table)
    .select('id, name, email')
    .eq('email', email)
    .maybeSingle()
  if (!account) return ok

  // 管理者は無効化されていないことも確認
  if (kind === 'admin') {
    const { data: admin } = await supabaseAdmin
      .from('ft_admins')
      .select('is_active')
      .eq('id', account.id)
      .single()
    if (!admin?.is_active) return ok
  }

  const token = randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + 60 * 60 * 1000) // 1時間
  const { error } = await supabaseAdmin.from('ft_password_resets').insert({
    token,
    kind,
    target_id: account.id,
    expires_at: expires.toISOString(),
  })
  if (error) return ok // 内部エラーでもアカウント有無は漏らさない

  const proto = req.headers.get('x-forwarded-proto') ?? 'http'
  const origin = req.headers.get('origin') ?? `${proto}://${req.headers.get('host')}`
  const url = `${origin}/ja/reset-password?token=${token}`

  await sendMail(
    account.email,
    '【フライトライブ予約システム】パスワード再設定のご案内',
    mailBody([
      `${account.name} 様`,
      '',
      'パスワード再設定のリクエストを受け付けました。',
      '以下のリンクから新しいパスワードを設定してください（1時間有効・1回のみ使用可）。',
      '',
      url,
      '',
      '心当たりがない場合は、このメールは破棄してください（パスワードは変更されません）。',
    ])
  )
  return ok
}
