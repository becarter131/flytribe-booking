import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyPassword } from '@/lib/password'

const schema = z.object({
  email: z.email(),
  password: z.string().min(1).max(100),
})

// メールアドレスとパスワードでログインする
export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'メールアドレスとパスワードを入力してください' },
      { status: 400 }
    )
  }
  const { email, password } = parsed.data

  const { data: user } = await supabaseAdmin
    .from('ft_users')
    .select('id, name, email, password_hash')
    .eq('email', email)
    .maybeSingle()

  if (!user) {
    return NextResponse.json(
      { error: 'メールアドレスまたはパスワードが違います' },
      { status: 401 }
    )
  }
  // パスワード未設定の既存アカウント: 新規会員登録から同じメールで登録するとパスワードが設定される
  if (!user.password_hash) {
    return NextResponse.json(
      {
        error:
          'このアカウントはパスワード未設定です。「新規会員登録はこちら」から同じメールアドレスで登録するとパスワードを設定できます',
      },
      { status: 400 }
    )
  }
  if (!verifyPassword(password, user.password_hash)) {
    return NextResponse.json(
      { error: 'メールアドレスまたはパスワードが違います' },
      { status: 401 }
    )
  }

  return NextResponse.json({ id: user.id, name: user.name })
}
