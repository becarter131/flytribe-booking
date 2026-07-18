import 'server-only'
import { createHash, timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// 管理者認証:
// - 管理者: ログインで発行されるセッショントークン（ft_admin_sessions）
// - オーナー: ft_admins.is_owner フラグ付きの管理者（招待コード発行・管理者管理が可能）
// - 環境変数 ADMIN_PASSWORD は全オーナーがログイン不能になった時の非常用（オーナー扱い）

function safeEqual(provided: string, expected: string): boolean {
  // 長さ差でタイミング比較が失敗しないようハッシュ化してから比較する
  const a = createHash('sha256').update(provided).digest()
  const b = createHash('sha256').update(expected).digest()
  return timingSafeEqual(a, b)
}

function bearer(req: NextRequest): string {
  const header = req.headers.get('authorization') ?? ''
  return header.startsWith('Bearer ') ? header.slice(7) : ''
}

export function isOwner(req: NextRequest): boolean {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) return false
  return safeEqual(bearer(req), expected)
}

interface SessionAdmin {
  is_active: boolean
  is_owner: boolean
}

// セッショントークンから有効な管理者を引く（無効/期限切れは null）
async function sessionAdmin(req: NextRequest): Promise<SessionAdmin | null> {
  const token = bearer(req)
  if (!token) return null
  const { data: session } = await supabaseAdmin
    .from('ft_admin_sessions')
    .select('expires_at, admin:ft_admins(is_active, is_owner)')
    .eq('token', token)
    .maybeSingle()
  if (!session || new Date(session.expires_at) <= new Date()) return null
  const admin = Array.isArray(session.admin) ? session.admin[0] : session.admin
  return admin?.is_active ? admin : null
}

// オーナー専用（招待コード発行・管理者の無効化など）。
// is_owner フラグ付き管理者のセッション、または非常用パスワードなら通す。
export async function requireOwner(req: NextRequest): Promise<NextResponse | null> {
  if (isOwner(req)) return null
  const admin = await sessionAdmin(req)
  if (admin?.is_owner) return null
  return NextResponse.json({ error: 'オーナー権限が必要です' }, { status: 401 })
}

// 管理者（またはオーナー）専用。
export async function requireAdmin(req: NextRequest): Promise<NextResponse | null> {
  if (isOwner(req)) return null
  const admin = await sessionAdmin(req)
  if (admin) return null
  return NextResponse.json({ error: 'ログインし直してください' }, { status: 401 })
}
