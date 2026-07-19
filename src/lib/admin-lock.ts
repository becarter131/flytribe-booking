import 'server-only'
import { supabaseAdmin } from '@/lib/supabase'

// 管理者ログインのアカウントロック:
// 直近10分間に10回以上失敗したメールアドレスを一時的にロックする
const LOCK_WINDOW_MIN = 10
const LOCK_THRESHOLD = 10

export const LOCK_MESSAGE =
  'ログインの失敗が続いたため、一時的にロックされました。しばらく時間をおいて再度お試しください'

export async function isLocked(email: string): Promise<boolean> {
  const since = new Date(Date.now() - LOCK_WINDOW_MIN * 60 * 1000).toISOString()
  const { count } = await supabaseAdmin
    .from('ft_admin_login_failures')
    .select('id', { count: 'exact', head: true })
    .eq('email', email)
    .gte('created_at', since)
  return (count ?? 0) >= LOCK_THRESHOLD
}

export async function recordFailure(email: string): Promise<void> {
  await supabaseAdmin.from('ft_admin_login_failures').insert({ email })
}

export async function clearFailures(email: string): Promise<void> {
  await supabaseAdmin.from('ft_admin_login_failures').delete().eq('email', email)
}
