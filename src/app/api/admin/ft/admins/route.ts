import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'

const schema = z.object({
  name: z.string().min(1).max(100),
  birthdate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  phone: z.string().min(8).max(20),
  email: z.email(),
})

// 管理者アカウントの登録（既存メールならそのまま返す）
export async function POST(req: NextRequest) {
  const denied = requireAdmin(req)
  if (denied) return denied

  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json(
      { error: '氏名・生年月日・電話番号・メールアドレスをすべて入力してください' },
      { status: 400 }
    )
  }
  const { name, birthdate, phone, email } = parsed.data

  const { data: existing } = await supabaseAdmin
    .from('ft_admins')
    .select('*')
    .eq('email', email)
    .maybeSingle()
  if (existing) return NextResponse.json(existing)

  const { data, error } = await supabaseAdmin
    .from('ft_admins')
    .insert({ name, birthdate, phone, email })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}

// 登録済み管理者の一覧
export async function GET(req: NextRequest) {
  const denied = requireAdmin(req)
  if (denied) return denied

  const { data, error } = await supabaseAdmin
    .from('ft_admins')
    .select('id, name, email, created_at')
    .order('created_at')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
