import 'server-only'
import { supabaseAdmin } from '@/lib/supabase'

// メール通知（Resend）。RESEND_API_KEY / MAIL_FROM が未設定の間は何もしない。
// 通知の失敗で予約処理を止めないよう、エラーはすべて握りつぶす
export async function sendMail(
  to: string | string[],
  subject: string,
  text: string
): Promise<void> {
  const key = process.env.RESEND_API_KEY
  const from = process.env.MAIL_FROM // 例: フライトライブ予約 <noreply@flytribe.co.jp>
  const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean)
  if (!key || !from || recipients.length === 0) return
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ from, to: recipients, subject, text }),
    })
  } catch {
    // 通知失敗は無視（予約処理を優先）
  }
}

// 差出人・返信先を指定して送るメール（お問い合わせ用など）。
// from は Resend で認証済みの flytribe.co.jp ドメインのアドレスに限る
export async function sendMailAs(opts: {
  from: string
  to: string | string[]
  subject: string
  text: string
  replyTo?: string
}): Promise<void> {
  const key = process.env.RESEND_API_KEY
  const recipients = (Array.isArray(opts.to) ? opts.to : [opts.to]).filter(Boolean)
  if (!key || recipients.length === 0) return
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        from: opts.from,
        to: recipients,
        subject: opts.subject,
        text: opts.text,
        ...(opts.replyTo && { reply_to: opts.replyTo }),
      }),
    })
  } catch {
    // 通知失敗は無視
  }
}

// 登録済みの管理者全員へ通知する
export async function notifyAdmins(subject: string, text: string): Promise<void> {
  // 無効化された管理者には通知しない
  const { data: admins } = await supabaseAdmin
    .from('ft_admins')
    .select('email')
    .eq('is_active', true)
  const emails = (admins ?? []).map((a) => a.email as string)
  if (emails.length === 0) return
  await sendMail(emails, subject, text)
}

const SIGNATURE = '\n\n──\nフライトライブ予約システム\nhttps://flytribe-booking.vercel.app'

export function mailBody(lines: string[]): string {
  return lines.join('\n') + SIGNATURE
}
