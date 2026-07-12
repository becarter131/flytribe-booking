import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase'

const schema = z.object({
  name: z.string().min(1).max(100),
  email: z.email(),
})

// 利用者登録（既存メールならそのまま返す）
export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: '入力内容を確認してください' }, { status: 400 })
  }
  const { name, email } = parsed.data

  const { data: existing } = await supabaseAdmin
    .from('ft_users')
    .select('*')
    .eq('email', email)
    .maybeSingle()
  if (existing) return NextResponse.json(existing)

  const { data, error } = await supabaseAdmin
    .from('ft_users')
    .insert({ name, email })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
