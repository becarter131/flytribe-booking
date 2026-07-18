import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'
import { newTicketCode } from '@/lib/ticket-code'

// チケット一覧（管理者用）
export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  const [{ data: coupons }, { data: activities }] = await Promise.all([
    supabaseAdmin.from('ft_coupons').select('*').order('created_at', { ascending: false }),
    supabaseAdmin.from('ft_activities').select('id, name'),
  ])
  const nameOf = (id: string | null) =>
    id ? ((activities ?? []).find((a) => a.id === id)?.name ?? '不明') : '全区分'

  const now = new Date()
  return NextResponse.json(
    (coupons ?? []).map((c) => ({
      id: c.id,
      code: c.code,
      description: c.description,
      activityName: nameOf(c.activity_id),
      remainingUses: c.remaining_uses,
      isActive: c.is_active,
      issuedAt: c.created_at,
      expiresAt: c.expires_at,
      expired: c.expires_at != null && new Date(c.expires_at) < now,
    }))
  )
}

const createSchema = z.object({
  description: z.string().max(100).optional(),
  uses: z.number().int().min(1).max(1000),
  activityId: z.uuid().nullable().optional(), // null = 全区分で使える
})

// チケット発行（コードは自動生成）
export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  const parsed = createSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: '入力内容を確認してください' }, { status: 400 })
  }
  const { description, uses, activityId } = parsed.data

  const code = newTicketCode()

  const { data, error } = await supabaseAdmin
    .from('ft_coupons')
    .insert({
      code,
      description: description || null,
      activity_id: activityId ?? null,
      remaining_uses: uses,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ id: data.id, code: data.code }, { status: 201 })
}

const patchSchema = z.object({
  couponId: z.uuid(),
  isActive: z.boolean(),
})

// チケットの有効/無効切り替え
export async function PATCH(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  const parsed = patchSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: '入力内容を確認してください' }, { status: 400 })
  }
  const { error } = await supabaseAdmin
    .from('ft_coupons')
    .update({ is_active: parsed.data.isActive })
    .eq('id', parsed.data.couponId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
