import 'server-only'
import { createHash, timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// 管理者認証は2段構え:
// - オーナー: 環境変数 ADMIN_PASSWORD（招待コード発行・管理者管理ができる最上位権限）
// - 管理者: ログインで発行されるセッショントークン（ft_admin_sessions）

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

// オーナー専用（招待コード発行・管理者の無効化など）
export function requireOwner(req: NextRequest): NextResponse | null {
  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'ADMIN_PASSWORD is not configured' }, { status: 500 })
  }
  if (!isOwner(req)) {
    return NextResponse.json({ error: 'オーナーパスワードが違います' }, { status: 401 })
  }
  return null
}

// 管理者（またはオーナー）専用。
// 有効なセッショントークン、もしくはオーナーパスワードなら通す。
export async function requireAdmin(req: NextRequest): Promise<NextResponse | null> {
  if (isOwner(req)) return null

  const token = bearer(req)
  if (token) {
    const { data: session } = await supabaseAdmin
      .from('ft_admin_sessions')
      .select('admin_id, expires_at, admin:ft_admins(is_active)')
      .eq('token', token)
      .maybeSingle()
    if (session && new Date(session.expires_at) > new Date()) {
      const admin = Array.isArray(session.admin) ? session.admin[0] : session.admin
      if (admin?.is_active) return null
    }
  }
  return NextResponse.json({ error: 'ログインし直してください' }, { status: 401 })
}
