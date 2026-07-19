import { randomInt } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyPassword } from '@/lib/password'
import { mailBody, sendMail } from '@/lib/notify'
import { isLocked, LOCK_MESSAGE, recordFailure } from '@/lib/admin-lock'

const schema = z.object({
  email: z.email(),
  password: z.string().min(1).max(200),
})

// 管理者ログイン（第1段階）: メール+パスワードを検証し、OTPをメール送信する。
// この時点ではセッションを発行しない（第2段階の /verify で発行）
export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: '入力内容を確認してください' }, { status: 400 })
  }
  const { email, password } = parsed.data

  if (await isLocked(email)) {
    return NextResponse.json({ error: LOCK_MESSAGE }, { status: 429 })
  }

  const { data: admin } = await supabaseAdmin
    .from('ft_admins')
    .select('id, name, email, password_hash, is_active, is_owner')
    .eq('email', email)
    .maybeSingle()

  if (admin && !admin.password_hash) {
    return NextResponse.json(
      { error: 'パスワード未設定のアカウントです。招待コードで再登録してください' },
      { status: 403 }
    )
  }
  if (!admin || !admin.is_active || !verifyPassword(password, admin.password_hash)) {
    await recordFailure(email)
    return NextResponse.json({ error: 'メールアドレスまたはパスワードが違います' }, { status: 401 })
  }

  // 2段階認証コードを発行してメール送信（10分有効・古いコードは無効化）
  await supabaseAdmin.from('ft_admin_otp').delete().eq('admin_id', admin.id).is('used_at', null)
  const code = String(randomInt(0, 1000000)).padStart(6, '0')
  const expires = new Date(Date.now() + 10 * 60 * 1000)
  const { error } = await supabaseAdmin
    .from('ft_admin_otp')
    .insert({ admin_id: admin.id, code, expires_at: expires.toISOString() })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await sendMail(
    admin.email,
    '【フライトライブ管理画面】ログイン確認コード',
    mailBody([
      `${admin.name} 様`,
      '',
      '管理画面ログインの確認コードです（10分間有効）。',
      '',
      `確認コード: ${code}`,
      '',
      '心当たりがない場合は、このメールを破棄してください（パスワードの変更をおすすめします）。',
    ])
  )

  return NextResponse.json({ otpRequired: true, email: admin.email })
}
