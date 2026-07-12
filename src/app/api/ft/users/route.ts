import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase'
import { hashPassword } from '@/lib/password'

const schema = z.object({
  name: z.string().min(1).max(100),
  companyName: z.string().max(100).optional(), // 法人の場合のみ
  email: z.email(),
  phone: z.string().min(8).max(20),
  birthdate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  password: z.string().min(8).max(100),
})

// ログイン中の利用者情報（表示用）
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  const { data: user } = await supabaseAdmin
    .from('ft_users')
    .select('id, name, company_name')
    .eq('id', userId)
    .maybeSingle()
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({
    id: user.id,
    name: user.name,
    companyName: user.company_name ?? null,
  })
}

// 利用者登録
// 既存メールでパスワード未設定なら情報を更新してパスワードを設定（旧アカウントの移行）
// 既存メールでパスワード設定済みならログインを案内する
export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          'お名前・メールアドレス・電話番号・生年月日・パスワード（8文字以上）をすべて入力してください',
      },
      { status: 400 }
    )
  }
  const { name, companyName, email, phone, birthdate, password } = parsed.data
  const passwordHash = hashPassword(password)
  const company = companyName?.trim() || null

  const { data: existing } = await supabaseAdmin
    .from('ft_users')
    .select('*')
    .eq('email', email)
    .maybeSingle()
  if (existing) {
    if (existing.password_hash) {
      return NextResponse.json(
        { error: 'このメールアドレスは登録済みです。ログインしてください' },
        { status: 400 }
      )
    }
    const { data: updated } = await supabaseAdmin
      .from('ft_users')
      .update({ name, company_name: company, phone, birthdate, password_hash: passwordHash })
      .eq('id', existing.id)
      .select()
      .single()
    return NextResponse.json(updated ?? existing)
  }

  const { data, error } = await supabaseAdmin
    .from('ft_users')
    .insert({ name, company_name: company, email, phone, birthdate, password_hash: passwordHash })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
