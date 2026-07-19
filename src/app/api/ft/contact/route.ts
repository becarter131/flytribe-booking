import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { mailBody, sendMailAs } from '@/lib/notify'

const CONTACT_TO = 'info@flytribe.co.jp'
const CONTACT_FROM = 'フライトライブ予約システム <info@flytribe.co.jp>'

const schema = z.object({
  name: z.string().min(1).max(100),
  email: z.email(),
  phone: z.string().max(20).optional(),
  message: z.string().min(1).max(4000),
  // ハニーポット（画面には表示されない欄。botが埋めたら破棄する）
  website: z.string().max(0).optional(),
})

// お問い合わせの受付。info@ へ内容を転送し、申込者へ受付メールを自動返信する
export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'お名前・メールアドレス・お問い合わせ内容を入力してください' },
      { status: 400 }
    )
  }
  const { name, email, phone, message } = parsed.data

  // info@ への通知（返信先を問い合わせ者にして、そのまま返信できるように）
  await sendMailAs({
    from: CONTACT_FROM,
    to: CONTACT_TO,
    replyTo: email,
    subject: `【お問い合わせ】${name} 様より`,
    text: [
      'サイトのお問い合わせフォームから連絡がありました。',
      '',
      `お名前: ${name}`,
      `メール: ${email}`,
      `電話: ${phone || '-'}`,
      '',
      '--- お問い合わせ内容 ---',
      message,
      '',
      '※ このメールに返信すると、お問い合わせ者へ直接届きます',
    ].join('\n'),
  })

  // 問い合わせ者への受付メール（info@ から返す）
  await sendMailAs({
    from: CONTACT_FROM,
    to: email,
    subject: '【フライトライブ】お問い合わせを受け付けました',
    text: mailBody([
      `${name} 様`,
      '',
      'お問い合わせありがとうございます。以下の内容で受け付けました。',
      '担当者より順次ご連絡いたしますので、今しばらくお待ちください。',
      '',
      '--- お問い合わせ内容 ---',
      message,
    ]),
  })

  return NextResponse.json({ ok: true }, { status: 201 })
}
