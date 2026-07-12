import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase'

const schema = z.object({
  name: z.string().min(1).max(100),
  email: z.email(),
  phone: z.string().min(8).max(20),
  birthdate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

// 利用者登録（既存メールなら電話番号・生年月日を更新して返す）
export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'お名前・メールアドレス・電話番号・生年月日をすべて入力してください' },
      { status: 400 }
    )
  }
  const { name, email, phone, birthdate } = parsed.data

  const { data: existing } = await supabaseAdmin
    .from('ft_users')
    .select('*')
    .eq('email', email)
    .maybeSingle()
  if (existing) {
    const { data: updated } = await supabaseAdmin
      .from('ft_users')
      .update({ name, phone, birthdate })
      .eq('id', existing.id)
      .select()
      .single()
    return NextResponse.json(updated ?? existing)
  }

  const { data, error } = await supabaseAdmin
    .from('ft_users')
    .insert({ name, email, phone, birthdate })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
