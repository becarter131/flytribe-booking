import 'server-only'
import Stripe from 'stripe'

// STRIPE_SECRET_KEY 未設定の環境でもモジュール読み込みだけで落ちないよう遅延初期化
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  return new Stripe(key)
}
