import { randomBytes } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin, requireOwner } from '@/lib/admin-auth'
import { hashPassword } from '@/lib/password'

const registerSchema = z.object({
  inviteCode: z.string().min(1).max(30),
  name: z.string().min(1).max(100),
  birthdate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  phone: z.string().min(8).max(20),
  email: z.email(),
  password: z.string().min(8).max(200),
})

// 管理者アカウントの登録。
// オーナーが発行した未使用・有効期限内の招待コードが必須（認証ヘッダーは不要）
export async function POST(req: NextRequest) {
  const parsed = registerSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json(
      { error: '招待コード・氏名・生年月日・電話番号・メールアドレス・パスワード(8文字以上)をすべて入力してください' },
      { status: 400 }
    )
  }
  const { inviteCode, name, birthdate, phone, email, password } = parsed.data

  // 招待コードの検証（チケットコードと同じく大小文字は区別しない）
  const { data: invite } = await supabaseAdmin
    .from('ft_admin_invites')
    .select('*')
    .ilike('code', inviteCode.trim())
    .maybeSingle()
  if (!invite) {
    return NextResponse.json({ error: '招待コードが正しくありません' }, { status: 400 })
  }
  if (invite.used_by_admin_id) {
    return NextResponse.json({ error: 'この招待コードは使用済みです' }, { status: 400 })
  }
  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'この招待コードは有効期限切れです' }, { status: 400 })
  }

  const { data: existing } = await supabaseAdmin
    .from('ft_admins')
    .select('id, password_hash')
    .eq('email', email)
    .maybeSingle()
  if (existing?.password_hash) {
    return NextResponse.json(
      { error: 'このメールアドレスは登録済みです。ログインしてください' },
      { status: 409 }
    )
  }

  // 旧方式（パスワード無し）の管理者は招待コード経由でパスワードを設定して引き継ぐ
  let adminId: string
  if (existing) {
    const { error } = await supabaseAdmin
      .from('ft_admins')
      .update({ name, birthdate, phone, password_hash: hashPassword(password), is_active: true })
      .eq('id', existing.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    adminId = existing.id
  } else {
    const { data, error } = await supabaseAdmin
      .from('ft_admins')
      .insert({ name, birthdate, phone, email, password_hash: hashPassword(password) })
      .select('id')
      .single()
    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? '登録に失敗しました' }, { status: 400 })
    }
    adminId = data.id
  }

  // 招待コードを使用済みにする（先着1名のみ。競合したら後続はエラー）
  const { data: consumed } = await supabaseAdmin
    .from('ft_admin_invites')
    .update({ used_by_admin_id: adminId, used_at: new Date().toISOString() })
    .eq('id', invite.id)
    .is('used_by_admin_id', null)
    .select('id')
  if (!consumed || consumed.length === 0) {
    return NextResponse.json({ error: 'この招待コードは使用済みです' }, { status: 400 })
  }

  // 登録後そのままログイン状態にする（セッション発行）
  const token = randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30日
  await supabaseAdmin
    .from('ft_admin_sessions')
    .insert({ token, admin_id: adminId, expires_at: expires.toISOString() })

  const { data: admin } = await supabaseAdmin
    .from('ft_admins')
    .select('id, name, email')
    .eq('id', adminId)
    .single()
  return NextResponse.json({ ...admin, token }, { status: 201 })
}

// 登録済み管理者の一覧（管理者・オーナー共通）
export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  const { data, error } = await supabaseAdmin
    .from('ft_admins')
    .select('id, name, email, is_active, password_hash, created_at')
    .order('created_at')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(
    (data ?? []).map((a) => ({
      id: a.id,
      name: a.name,
      email: a.email,
      isActive: a.is_active,
      hasPassword: !!a.password_hash,
      createdAt: a.created_at,
    }))
  )
}

const patchSchema = z.object({
  adminId: z.uuid(),
  isActive: z.boolean(),
})

// 管理者の有効化/無効化（オーナー専用）。無効化するとセッションも失効させる
export async function PATCH(req: NextRequest) {
  const denied = requireOwner(req)
  if (denied) return denied

  const parsed = patchSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: '入力内容を確認してください' }, { status: 400 })
  }
  const { adminId, isActive } = parsed.data

  const { error } = await supabaseAdmin
    .from('ft_admins')
    .update({ is_active: isActive })
    .eq('id', adminId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  if (!isActive) {
    await supabaseAdmin.from('ft_admin_sessions').delete().eq('admin_id', adminId)
  }
  return NextResponse.json({ ok: true })
}
