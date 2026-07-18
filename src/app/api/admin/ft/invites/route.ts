import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireOwner } from '@/lib/admin-auth'
import { newTicketCode } from '@/lib/ticket-code'

// 管理者招待コードの発行（オーナー専用・使い捨て・有効期限7日）
export async function POST(req: NextRequest) {
  const denied = requireOwner(req)
  if (denied) return denied

  const code = newTicketCode()
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const { error } = await supabaseAdmin
    .from('ft_admin_invites')
    .insert({ code, expires_at: expires.toISOString() })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ code, expiresAt: expires.toISOString() }, { status: 201 })
}

// 招待コードの一覧（オーナー専用）
export async function GET(req: NextRequest) {
  const denied = requireOwner(req)
  if (denied) return denied

  const { data, error } = await supabaseAdmin
    .from('ft_admin_invites')
    .select('id, code, expires_at, used_at, created_at, used_by:ft_admins(name)')
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(
    (data ?? []).map((i) => {
      const usedBy = Array.isArray(i.used_by) ? i.used_by[0] : i.used_by
      return {
        id: i.id,
        code: i.code,
        expiresAt: i.expires_at,
        usedAt: i.used_at,
        usedByName: usedBy?.name ?? null,
        createdAt: i.created_at,
      }
    })
  )
}
