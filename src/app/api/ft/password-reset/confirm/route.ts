import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase'
import { hashPassword } from '@/lib/password'

const schema = z.object({
  token: z.string().min(1).max(100),
  password: z.string().min(8).max(200),
})

// パスワード再設定の実行。有効なトークンなら新しいパスワードを保存する
export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json(
      { error: '新しいパスワード（8文字以上）を入力してください' },
      { status: 400 }
    )
  }
  const { token, password } = parsed.data

  const { data: reset } = await supabaseAdmin
    .from('ft_password_resets')
    .select('*')
    .eq('token', token)
    .maybeSingle()
  if (!reset || reset.used_at || new Date(reset.expires_at) < new Date()) {
    return NextResponse.json(
      { error: 'リンクが無効か期限切れです。もう一度再設定を申請してください' },
      { status: 400 }
    )
  }

  // トークンを先に使用済みへ（先着1回のみ。競合したら後続はエラー）
  const { data: consumed } = await supabaseAdmin
    .from('ft_password_resets')
    .update({ used_at: new Date().toISOString() })
    .eq('id', reset.id)
    .is('used_at', null)
    .select('id')
  if (!consumed || consumed.length === 0) {
    return NextResponse.json(
      { error: 'リンクが無効か期限切れです。もう一度再設定を申請してください' },
      { status: 400 }
    )
  }

  const table = reset.kind === 'admin' ? 'ft_admins' : 'ft_users'
  const { error } = await supabaseAdmin
    .from(table)
    .update({ password_hash: hashPassword(password) })
    .eq('id', reset.target_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 管理者は既存セッションを全て失効させる（第三者が使い続けるのを防ぐ）
  if (reset.kind === 'admin') {
    await supabaseAdmin.from('ft_admin_sessions').delete().eq('admin_id', reset.target_id)
  }

  return NextResponse.json({ ok: true, kind: reset.kind })
}
