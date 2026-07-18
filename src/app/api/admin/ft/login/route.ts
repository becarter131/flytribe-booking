import { randomBytes } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyPassword } from '@/lib/password'

const schema = z.object({
  email: z.email(),
  password: z.string().min(1).max(200),
})

// 管理者ログイン。成功したらセッショントークン（30日有効）を返す
export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: '入力内容を確認してください' }, { status: 400 })
  }
  const { email, password } = parsed.data

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
    return NextResponse.json({ error: 'メールアドレスまたはパスワードが違います' }, { status: 401 })
  }

  const token = randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  const { error } = await supabaseAdmin
    .from('ft_admin_sessions')
    .insert({ token, admin_id: admin.id, expires_at: expires.toISOString() })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 期限切れセッションはついでに掃除する
  await supabaseAdmin
    .from('ft_admin_sessions')
    .delete()
    .lt('expires_at', new Date().toISOString())

  return NextResponse.json({
    id: admin.id,
    name: admin.name,
    email: admin.email,
    isOwner: admin.is_owner,
    token,
  })
}
