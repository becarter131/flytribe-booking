import { randomBytes } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase'
import { clearFailures, isLocked, recordFailure } from '@/lib/admin-lock'

const schema = z.object({
  email: z.email(),
  code: z.string().regex(/^\d{6}$/),
})

// 管理者ログイン（第2段階）: メールで届いたOTPを検証し、セッショントークンを発行する
export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: '6桁の確認コードを入力してください' }, { status: 400 })
  }
  const { email, code } = parsed.data

  if (await isLocked(email)) {
    return NextResponse.json(
      { error: '試行が続いたため一時的にロックされました。しばらくしてからやり直してください' },
      { status: 429 }
    )
  }

  const { data: admin } = await supabaseAdmin
    .from('ft_admins')
    .select('id, name, email, is_active, is_owner')
    .eq('email', email)
    .maybeSingle()
  if (!admin || !admin.is_active) {
    await recordFailure(email)
    return NextResponse.json({ error: '確認コードが正しくありません' }, { status: 401 })
  }

  const { data: otp } = await supabaseAdmin
    .from('ft_admin_otp')
    .select('id, code, expires_at, used_at')
    .eq('admin_id', admin.id)
    .is('used_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!otp || otp.code !== code || new Date(otp.expires_at) < new Date()) {
    await recordFailure(email)
    return NextResponse.json(
      { error: '確認コードが正しくないか、有効期限が切れています' },
      { status: 401 }
    )
  }

  // コードを使用済みにしてセッションを発行
  await supabaseAdmin
    .from('ft_admin_otp')
    .update({ used_at: new Date().toISOString() })
    .eq('id', otp.id)

  const token = randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  const { error } = await supabaseAdmin
    .from('ft_admin_sessions')
    .insert({ token, admin_id: admin.id, expires_at: expires.toISOString() })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // ログイン成功: 失敗記録と期限切れセッション・古いOTPを掃除
  await Promise.all([
    clearFailures(email),
    supabaseAdmin.from('ft_admin_sessions').delete().lt('expires_at', new Date().toISOString()),
    supabaseAdmin.from('ft_admin_otp').delete().lt('expires_at', new Date().toISOString()),
  ])

  return NextResponse.json({
    id: admin.id,
    name: admin.name,
    email: admin.email,
    isOwner: admin.is_owner,
    token,
  })
}
